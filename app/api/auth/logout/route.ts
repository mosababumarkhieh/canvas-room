import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE } from "@/lib/session";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (token) {
    await prisma.session.deleteMany({ where: { token } }).catch(() => {});
  }

  const response = Response.json({ ok: true });
  response.headers.set(
    "Set-Cookie",
    `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`
  );
  return response;
}
