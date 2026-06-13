import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, unauthorized, forbidden, notFound, badRequest, serverError } from "@/lib/auth";

type Params = { params: { roomId: string } };

async function getRoomWithAccess(roomId: string, userId: string) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      owner: { select: { id: true, name: true, email: true, color: true } },
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, color: true } },
        },
      },
      _count: { select: { members: true } },
    },
  });

  if (!room) return { room: null, hasAccess: false, isOwner: false };

  const isOwner = room.ownerId === userId;
  const isMember = room.members.some((m) => m.userId === userId);
  const hasAccess = isOwner || isMember || room.isPublic;

  return { room, hasAccess, isOwner };
}

export async function GET(request: NextRequest, { params }: Params) {
  const user = await getAuthUser(request);
  if (!user) return unauthorized();

  const { roomId } = params;

  // Allow access via share token too
  const shareToken = request.nextUrl.searchParams.get("token");

  try {
    const { room, hasAccess } = await getRoomWithAccess(roomId, user.id);
    if (!room) return notFound("Room not found");

    const validToken = shareToken && room.shareToken === shareToken;
    if (!hasAccess && !validToken) return forbidden();

    // Add member if accessing via valid share token
    if (!hasAccess && validToken) {
      const alreadyMember = room.members.some((m) => m.userId === user.id);
      if (!alreadyMember) {
        await prisma.roomMember.create({
          data: { roomId, userId: user.id, role: "EDITOR" },
        });
      }
    }

    return Response.json({ room });
  } catch (err) {
    console.error("[room:GET]", err);
    return serverError();
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await getAuthUser(request);
  if (!user) return unauthorized();

  const { roomId } = params;

  try {
    const { room, isOwner } = await getRoomWithAccess(roomId, user.id);
    if (!room) return notFound("Room not found");
    if (!isOwner) return forbidden();

    const body = await request.json();
    const { name, isPublic } = body as { name?: string; isPublic?: boolean };

    if (name !== undefined && !name.trim()) {
      return badRequest("Room name cannot be empty");
    }

    const updated = await prisma.room.update({
      where: { id: roomId },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(isPublic !== undefined && { isPublic }),
      },
      include: {
        owner: { select: { id: true, name: true, email: true, color: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, color: true } },
          },
        },
        _count: { select: { members: true } },
      },
    });

    return Response.json({ room: updated });
  } catch (err) {
    console.error("[room:PATCH]", err);
    return serverError();
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const user = await getAuthUser(request);
  if (!user) return unauthorized();

  const { roomId } = params;

  try {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) return notFound("Room not found");
    if (room.ownerId !== user.id) return forbidden();

    await prisma.room.delete({ where: { id: roomId } });

    return Response.json({ ok: true });
  } catch (err) {
    console.error("[room:DELETE]", err);
    return serverError();
  }
}
