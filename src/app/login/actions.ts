"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { endSession, startSession } from "@/lib/auth";
import { authenticate, registerUser, StoreError } from "@/lib/store";

export type AuthState = { error: string } | null;

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  try {
    const user = await authenticate(email, password);
    await startSession(user.id);
  } catch (err) {
    if (err instanceof StoreError) return { error: err.message };
    throw err;
  }
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  try {
    const user = await registerUser({
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      name: String(formData.get("name") ?? ""),
    });
    await startSession(user.id);
  } catch (err) {
    if (err instanceof StoreError) return { error: err.message };
    throw err;
  }
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signOut() {
  endSession();
  revalidatePath("/", "layout");
  redirect("/login");
}
