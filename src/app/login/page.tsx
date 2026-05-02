import { Suspense } from "react";
import LoginForm from "./login-form";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-full bg-background px-6 py-16 text-center text-on-surface-variant">
          Loading…
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
