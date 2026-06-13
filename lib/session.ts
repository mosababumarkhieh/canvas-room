import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import type { AuthUser } from "@/types";

const SESSION_COOKIE = "cr_session";
const SESSION_DURATION_DAYS = 30;

export async function createSession(userId: string): Promise<string> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

  const session = await prisma.session.create({
    data: { userId, expiresAt },
  });

  return session.token;
}

export async function getSession(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    color: session.user.color,
  };
}

export async function deleteSession(token: string): Promise<void> {
  await prisma.session.deleteMany({ where: { token } }).catch(() => {});
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * SESSION_DURATION_DAYS,
    path: "/",
  };
}

export { SESSION_COOKIE };
