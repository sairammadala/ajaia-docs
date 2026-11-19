import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, signSession, verifySession } from "@/lib/jwt";
import { getUserById } from "@/lib/store";
import type { User } from "@/lib/types";

export async function startSession(userId: string) {
  const token = await signSession(userId);
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    // Set COOKIE_SECURE=true when serving over HTTPS.
    secure: process.env.COOKIE_SECURE === "true",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function endSession() {
  cookies().delete(SESSION_COOKIE);
}

/** The signed-in user, or null (also null if the account no longer exists). */
export async function getCurrentUser(): Promise<User | null> {
  const userId = await verifySession(cookies().get(SESSION_COOKIE)?.value);
  return userId ? getUserById(userId) : null;
}

/** For server components and actions: redirect to /login when signed out. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
