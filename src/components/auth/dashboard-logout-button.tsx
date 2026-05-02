"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DashboardLogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => void logout()}
      className="rounded-full bg-primary-container px-6 py-2.5 text-sm font-semibold text-on-primary shadow-[0_0_20px_-4px_rgba(44,233,255,0.35)] transition hover:brightness-110 disabled:opacity-60"
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
