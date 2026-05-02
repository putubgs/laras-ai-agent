"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AuthCard from "@/components/auth/auth-card";
import AuthPageShell from "@/components/auth/auth-page-shell";
import { AuthField } from "@/components/auth/auth-field";
import {
  validateEmail,
  validatePassword,
  validatePasswordMatch,
  validateSpecialKeyword,
} from "@utils/validation";

type Step = "verify" | "password";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("verify");
  const [email, setEmail] = useState("");
  const [keyword, setKeyword] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function handleVerifyNext(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    setFormError(null);
    const next: Record<string, string | null> = {};
    const em = validateEmail(email);
    if (!em.ok) next.email = em.message;
    const sk = validateSpecialKeyword(keyword);
    if (!sk.ok) next.keyword = sk.message;
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setErrors({});
    setStep("password");
    setTouched(false);
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    setFormError(null);
    const next: Record<string, string | null> = {};

    const pw = validatePassword(password);
    if (!pw.ok) next.password = pw.message;

    const m = validatePasswordMatch(password, confirm);
    if (!m.ok) next.confirm = m.message;

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          special_keyword: keyword,
          new_password: password,
          confirm_password: confirm,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setFormError(data.error ?? "Could not reset password.");
        return;
      }
      router.push("/login");
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
        title="Forgot password"
        subtitle={
          step === "verify"
            ? "Enter your email and the special keyword you set at registration."
            : "Choose a new password."
        }
        footer={
          <>
            Remembered it?{" "}
            <Link
              href="/login"
              className="font-medium text-primary-container hover:underline"
            >
              Sign in
            </Link>
          </>
        }
      >
        {step === "verify" ? (
          <form onSubmit={handleVerifyNext} className="space-y-5" noValidate>
            <AuthField
              id="email"
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(ev) => {
                setEmail(ev.target.value);
                if (touched) setErrors((o) => ({ ...o, email: null }));
              }}
              error={errors.email}
            />
            <AuthField
              id="special_keyword"
              label="Special keyword"
              autoComplete="off"
              value={keyword}
              onChange={(ev) => {
                setKeyword(ev.target.value);
                if (touched) setErrors((o) => ({ ...o, keyword: null }));
              }}
              error={errors.keyword}
            />
            <button
              type="submit"
              className="w-full rounded-full bg-primary-container py-3 text-sm font-semibold text-on-primary shadow-[0_0_20px_-4px_rgba(44,233,255,0.35)] transition hover:brightness-110"
            >
              Continue
            </button>
          </form>
        ) : (
          <form
            onSubmit={(e) => void handlePasswordSubmit(e)}
            className="space-y-5"
            noValidate
          >
            {formError ? (
              <p className="rounded-lg border border-error/40 bg-error-container/15 px-3 py-2 text-sm text-on-error-container">
                {formError}
              </p>
            ) : null}
            <button
              type="button"
              className="text-xs font-medium text-on-surface-variant hover:text-primary-container"
              onClick={() => {
                setStep("verify");
                setErrors({});
                setFormError(null);
                setTouched(false);
              }}
            >
              ← Back to email and keyword
            </button>
            <AuthField
              id="new_password"
              label="New password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(ev) => {
                setPassword(ev.target.value);
                if (touched) setErrors((o) => ({ ...o, password: null }));
                setFormError(null);
              }}
              error={errors.password}
            />
            <AuthField
              id="confirm_password"
              label="Confirm new password"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(ev) => {
                setConfirm(ev.target.value);
                if (touched) setErrors((o) => ({ ...o, confirm: null }));
                setFormError(null);
              }}
              error={errors.confirm}
            />
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-primary-container py-3 text-sm font-semibold text-on-primary shadow-[0_0_20px_-4px_rgba(44,233,255,0.35)] transition hover:brightness-110 disabled:opacity-60"
            >
              {submitting ? "Updating…" : "Reset password"}
            </button>
          </form>
        )}
      </AuthCard>
    </AuthPageShell>
  );
}
