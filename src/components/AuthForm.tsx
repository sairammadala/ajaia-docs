"use client";

import Link from "next/link";
import { useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Loader2 } from "lucide-react";
import { signIn, signUp, type AuthState } from "@/app/login/actions";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn btn-primary btn-lg w-full">
      {pending ? <Loader2 size={16} className="animate-spin" /> : null}
      {pending ? "One moment…" : label}
    </button>
  );
}

const DEMOS = [
  { name: "Alice", email: "alice@ajaia.test", note: "owns 2 docs" },
  { name: "Bob", email: "bob@ajaia.test", note: "editor on 1" },
];

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const isLogin = mode === "login";
  const [state, action] = useFormState<AuthState, FormData>(isLogin ? signIn : signUp, null);
  const formRef = useRef<HTMLFormElement>(null);

  function fillDemo(email: string) {
    const f = formRef.current;
    if (!f) return;
    (f.elements.namedItem("email") as HTMLInputElement).value = email;
    (f.elements.namedItem("password") as HTMLInputElement).value = "Password123";
    (f.elements.namedItem("password") as HTMLInputElement).focus();
  }

  return (
    <div>
      <h2 className="font-display text-[2rem] font-semibold leading-tight tracking-tight">
        {isLogin ? "Welcome back" : "Create your account"}
      </h2>
      <p className="mt-2 text-[15px] text-ink-muted">
        {isLogin ? "Sign in to pick up where you left off." : "It takes less than a minute. No card needed."}
      </p>

      <form ref={formRef} action={action} className="mt-8 space-y-4" noValidate={false}>
        {!isLogin ? (
          <div>
            <label htmlFor="name" className="label">
              Full name
            </label>
            <input id="name" name="name" autoComplete="name" className="input" placeholder="Ada Lovelace" />
          </div>
        ) : null}
        <div>
          <label htmlFor="email" className="label">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className={`input ${state?.error ? "input-error" : ""}`}
            placeholder="you@company.com"
          />
        </div>
        <div>
          <label htmlFor="password" className="label">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={isLogin ? undefined : 8}
            autoComplete={isLogin ? "current-password" : "new-password"}
            className={`input ${state?.error ? "input-error" : ""}`}
            placeholder={isLogin ? "Your password" : "At least 8 characters"}
          />
        </div>

        {state?.error ? (
          <div role="alert" className="alert-error">
            <AlertCircle size={16} className="mt-px shrink-0" />
            {state.error}
          </div>
        ) : null}

        <Submit label={isLogin ? "Sign in" : "Create account"} />
      </form>

      <p className="mt-6 text-center text-sm text-ink-muted">
        {isLogin ? "New to Ajaia Docs?" : "Already have an account?"}{" "}
        <Link
          href={isLogin ? "/register" : "/login"}
          className="rounded font-medium text-brand-700 underline-offset-4 hover:underline"
        >
          {isLogin ? "Create an account" : "Sign in"}
        </Link>
      </p>

      {isLogin ? (
        <div className="mt-8 rounded-xl border border-dashed border-line-strong bg-white/60 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-ink-faint">Demo accounts</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {DEMOS.map((d) => (
              <button
                key={d.email}
                type="button"
                onClick={() => fillDemo(d.email)}
                className="rounded-lg border border-line bg-white px-3 py-2 text-left transition hover:border-brand-400 hover:bg-brand-50"
              >
                <span className="block text-sm font-medium">{d.name}</span>
                <span className="block text-xs text-ink-muted">{d.note}</span>
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-ink-muted">
            Click to fill the form. Password for both: <code className="rounded bg-paper-deep px-1">Password123</code>
          </p>
        </div>
      ) : null}
    </div>
  );
}
