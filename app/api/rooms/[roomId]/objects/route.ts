import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, unauthorized, forbidden, notFound, serverError } from "@/lib/auth";
import type { WhiteboardObject } from "@/types";

type Params = { params: { roomId: string } };

async function canAccessRoom(roomId: string, userId: string) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { members: { select: { userId: true } } },
  });
  if (!room) return { room: null, canEdit: false };
  const isOwner = room.ownerId === userId;
  const isMember = room.members.some((m) => m.userId === userId);
  return { room, canEdit: isOwner || isMember };
}

// Load board state
export async function GET(request: NextRequest, { params }: Params) {
  const user = await getAuthUser(request);
  if (!user) return unauthorized();

  const { roomId } = params;

  try {
    const snapshot = await prisma.roomSnapshot.findUnique({
      where: { roomId },
    });

    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) return notFound("Room not found");

    const canView =
      room.ownerId === user.id ||
      room.isPublic ||
      (await prisma.roomMember.findUnique({
        where: { roomId_userId: { roomId, userId: user.id } },
      })) !== null;

    if (!canView) return forbidden();

    const objects: WhiteboardObject[] = (snapshot?.objects as unknown as WhiteboardObject[]) ?? [];
    return Response.json({ objects, version: snapshot?.version ?? 0 });
  } catch (err) {
    console.error("[objects:GET]", err);
    return serverError();
  }
}

// Autosave board state (full snapshot replace)
export async function PUT(request: NextRequest, { params }: Params) {
  const user = await getAuthUser(request);
  if (!user) return unauthorized();

  const { roomId } = params;

  try {
    const { canEdit } = await canAccessRoom(roomId, user.id);

    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) return notFound("Room not found");

    const isOwner = room.ownerId === user.id;
    if (!canEdit && !isOwner) return forbidden();

    const body = await request.json();
    const { objects } = body as { objects: WhiteboardObject[] };

    const snapshot = await prisma.roomSnapshot.upsert({
      where: { roomId },
      create: { roomId, objects: objects as object[], version: 1 },
      update: {
        objects: objects as object[],
        version: { increment: 1 },
        savedAt: new Date(),
      },
    });

    await prisma.room.update({ where: { id: roomId }, data: { updatedAt: new Date() } });

    return Response.json({ ok: true, version: snapshot.version });
  } catch (err) {
    console.error("[objects:PUT]", err);
    return serverError();
  }
}
