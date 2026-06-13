import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import type { AuthUser } from "@/types";

export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  const token = request.cookies.get("cr_session")?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) return null;

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    color: session.user.color,
  };
}

export function unauthorized() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

export function forbidden() {
  return Response.json({ error: "Forbidden" }, { status: 403 });
}

export function notFound(message = "Not found") {
  return Response.json({ error: message }, { status: 404 });
}

export function badRequest(message: string) {
  return Response.json({ error: message }, { status: 400 });
}

export function serverError(message = "Internal server error") {
  return Response.json({ error: message }, { status: 500 });
}
