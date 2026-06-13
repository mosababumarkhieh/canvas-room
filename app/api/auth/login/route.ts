import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { createSession, getSessionCookieOptions, SESSION_COOKIE } from "@/lib/session";
import { badRequest, serverError } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body as { email?: string; password?: string };

    if (!email?.trim() || !password) {
      return badRequest("Email and password are required");
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return badRequest("Invalid email or password");
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return badRequest("Invalid email or password");
    }

    const token = await createSession(user.id);
    const response = Response.json({
      user: { id: user.id, email: user.email, name: user.name, color: user.color },
    });

    const cookieOptions = getSessionCookieOptions();
    response.headers.set(
      "Set-Cookie",
      `${SESSION_COOKIE}=${token}; Path=${cookieOptions.path}; Max-Age=${cookieOptions.maxAge}; HttpOnly; SameSite=Lax${cookieOptions.secure ? "; Secure" : ""}`
    );

    return response;
  } catch (err) {
    console.error("[login]", err);
    return serverError();
  }
}
