"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import AuthCard from "@/components/auth/auth-card";
import AuthPageShell from "@/components/auth/auth-page-shell";
import { AuthField } from "@/components/auth/auth-field";
import { validateEmail } from "@utils/validation/email";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEmailError(null);
    setPasswordError(null);
    setFormError(null);

    const eRes = validateEmail(email);
    if (!eRes.ok) {
      setEmailError(eRes.message);
      return;
    }
    if (!password) {
      setPasswordError("Password is required.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setFormError(data.error ?? "Sign in failed.");
        return;
      }
      const from = searchParams.get("from");
      router.push(from?.startsWith("/") ? from : "/dashboard");
      router.refresh();
    } catch {
      setFormError("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthPageShell>
      <AuthCard
        title="Sign in"
        subtitle="Session lasts 3 hours. Auth is app-managed; Supabase stores users only."
        footer={
          <>
            No account?{" "}
            <Link
              href="/register"
              className="font-medium text-primary-container hover:underline"
            >
              Register
            </Link>
            {" · "}
            <Link
              href="/forgot-password"
              className="font-medium text-primary-container hover:underline"
            >
              Forgot password
            </Link>
          </>
        }
      >
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5" noValidate>
          {formError ? (
            <p className="rounded-lg border border-error/40 bg-error-container/15 px-3 py-2 text-sm text-on-error-container">
              {formError}
            </p>
          ) : null}
          <AuthField
            id="email"
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(ev) => {
              setEmail(ev.target.value);
              setEmailError(null);
              setFormError(null);
            }}
            error={emailError}
          />
          <AuthField
            id="password"
            label="Password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(ev) => {
              setPassword(ev.target.value);
              setPasswordError(null);
              setFormError(null);
            }}
            error={passwordError}
          />
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-primary-container py-3 text-sm font-semibold text-on-primary shadow-[0_0_20px_-4px_rgba(44,233,255,0.35)] transition hover:brightness-110 disabled:opacity-60"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </AuthCard>
    </AuthPageShell>
  );
}
