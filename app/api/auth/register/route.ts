import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { createSession, getSessionCookieOptions, SESSION_COOKIE } from "@/lib/session";
import { USER_COLORS } from "@/lib/utils";
import { badRequest, serverError } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password } = body as {
      name?: string;
      email?: string;
      password?: string;
    };

    if (!name?.trim() || !email?.trim() || !password) {
      return badRequest("Name, email, and password are required");
    }

    if (password.length < 8) {
      return badRequest("Password must be at least 8 characters");
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return badRequest("An account with that email already exists");
    }

    const hashed = await bcrypt.hash(password, 12);
    const colorIndex = await prisma.user.count();

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashed,
        color: USER_COLORS[colorIndex % USER_COLORS.length],
      },
    });

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
    console.error("[register]", err);
    return serverError();
  }
}
