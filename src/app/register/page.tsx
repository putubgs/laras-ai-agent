"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AuthCard from "@/components/auth/auth-card";
import { AuthField } from "@/components/auth/auth-field";
import {
  validateEmail,
  validateFullName,
  validatePassword,
  validatePasswordMatch,
  validateSpecialKeyword,
} from "@/validation";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [keyword, setKeyword] = useState("");
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [touched, setTouched] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    const next: Record<string, string | null> = {};

    const fn = validateFullName(fullName);
    if (!fn.ok) next.fullName = fn.message;

    const em = validateEmail(email);
    if (!em.ok) next.email = em.message;

    const pw = validatePassword(password);
    if (!pw.ok) next.password = pw.message;

    const m = validatePasswordMatch(password, confirm);
    if (!m.ok) next.confirm = m.message;

    const sk = validateSpecialKeyword(keyword);
    if (!sk.ok) next.specialKeyword = sk.message;

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    router.push("/login");
  }

  return (
    <main className="min-h-full bg-background">
      <AuthCard
        title="Create account"
        subtitle="Dummy registration — data is not stored."
        footer={
          <>
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-primary-container hover:underline"
            >
              Sign in
            </Link>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <AuthField
            id="full_name"
            label="Full name"
            autoComplete="name"
            value={fullName}
            onChange={(ev) => {
              setFullName(ev.target.value);
              if (touched) setErrors((o) => ({ ...o, fullName: null }));
            }}
            error={errors.fullName}
          />
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
            id="password"
            label="Password"
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
            id="confirm"
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(ev) => {
              setConfirm(ev.target.value);
              if (touched) setErrors((o) => ({ ...o, confirm: null }));
            }}
            error={errors.confirm}
          />
          <AuthField
            id="special_keyword"
            label="Special keyword (for password recovery)"
            autoComplete="off"
            placeholder="Memorable phrase only you know"
            value={keyword}
            onChange={(ev) => {
              setKeyword(ev.target.value);
              if (touched) setErrors((o) => ({ ...o, specialKeyword: null }));
            }}
            error={errors.specialKeyword}
          />
          <button
            type="submit"
            className="w-full rounded-full bg-primary-container py-3 text-sm font-semibold text-on-primary shadow-[0_0_20px_-4px_rgba(44,233,255,0.35)] transition hover:brightness-110"
          >
            Register
          </button>
        </form>
      </AuthCard>
    </main>
  );
}
