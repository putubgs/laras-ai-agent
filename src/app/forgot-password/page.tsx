"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AuthCard from "@/components/auth/auth-card";
import { AuthField } from "@/components/auth/auth-field";
import {
  validatePassword,
  validatePasswordMatch,
  validateSpecialKeyword,
} from "@/validation";

type Step = "keyword" | "password";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("keyword");
  const [keyword, setKeyword] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [touched, setTouched] = useState(false);

  function handleKeywordNext(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    const sk = validateSpecialKeyword(keyword);
    if (!sk.ok) {
      setErrors({ keyword: sk.message });
      return;
    }
    setErrors({});
    setStep("password");
    setTouched(false);
  }

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    const next: Record<string, string | null> = {};

    const pw = validatePassword(password);
    if (!pw.ok) next.password = pw.message;

    const m = validatePasswordMatch(password, confirm);
    if (!m.ok) next.confirm = m.message;

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    // Dummy — no API
    router.push("/login");
  }

  return (
    <main className="min-h-full bg-background">
      <AuthCard
        title="Forgot password"
        subtitle={
          step === "keyword"
            ? "Step 1 — enter the special keyword you set at registration."
            : "Step 2 — choose a new password."
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
        {step === "keyword" ? (
          <form onSubmit={handleKeywordNext} className="space-y-5" noValidate>
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
          <form onSubmit={handlePasswordSubmit} className="space-y-5" noValidate>
            <button
              type="button"
              className="text-xs font-medium text-on-surface-variant hover:text-primary-container"
              onClick={() => {
                setStep("keyword");
                setErrors({});
                setTouched(false);
              }}
            >
              ← Back to special keyword
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
              }}
              error={errors.confirm}
            />
            <button
              type="submit"
              className="w-full rounded-full bg-primary-container py-3 text-sm font-semibold text-on-primary shadow-[0_0_20px_-4px_rgba(44,233,255,0.35)] transition hover:brightness-110"
            >
              Reset password
            </button>
          </form>
        )}
      </AuthCard>
    </main>
  );
}
