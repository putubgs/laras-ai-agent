"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AuthCard from "@/components/auth/auth-card";
import { AuthField } from "@/components/auth/auth-field";
import { validateEmail } from "@/validation/email";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEmailError(null);
    setPasswordError(null);

    const eRes = validateEmail(email);
    if (!eRes.ok) {
      setEmailError(eRes.message);
      return;
    }
    if (!password) {
      setPasswordError("Password is required.");
      return;
    }

    // Dummy auth — replace with API + session
    router.push("/");
  }

  return (
    <main className="min-h-full bg-background">
      <AuthCard
        title="Sign in"
        subtitle="Dummy auth — no backend yet."
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
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <AuthField
            id="email"
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(ev) => {
              setEmail(ev.target.value);
              setEmailError(null);
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
            }}
            error={passwordError}
          />
          <button
            type="submit"
            className="w-full rounded-full bg-primary-container py-3 text-sm font-semibold text-on-primary shadow-[0_0_20px_-4px_rgba(44,233,255,0.35)] transition hover:brightness-110"
          >
            Sign in
          </button>
        </form>
      </AuthCard>
    </main>
  );
}
