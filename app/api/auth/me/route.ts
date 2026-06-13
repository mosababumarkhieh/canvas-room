import { NextRequest } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorized();
  return Response.json({ user });
}
