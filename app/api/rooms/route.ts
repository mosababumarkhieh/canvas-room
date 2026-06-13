import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, unauthorized, badRequest, serverError } from "@/lib/auth";
import { generateUniqueSlug } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorized();

  try {
    const rooms = await prisma.room.findMany({
      where: {
        OR: [
          { ownerId: user.id },
          { members: { some: { userId: user.id } } },
        ],
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
      orderBy: { updatedAt: "desc" },
    });

    return Response.json({ rooms });
  } catch (err) {
    console.error("[rooms:GET]", err);
    return serverError();
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorized();

  try {
    const body = await request.json();
    const { name, isPublic } = body as { name?: string; isPublic?: boolean };

    if (!name?.trim()) return badRequest("Room name is required");

    const slug = generateUniqueSlug(name);

    const room = await prisma.room.create({
      data: {
        name: name.trim(),
        slug,
        ownerId: user.id,
        isPublic: isPublic ?? false,
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

    return Response.json({ room }, { status: 201 });
  } catch (err) {
    console.error("[rooms:POST]", err);
    return serverError();
  }
}
