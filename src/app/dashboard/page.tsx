import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySessionToken } from "@/lib/auth/session";
import { DashboardLogoutButton } from "@/components/auth/dashboard-logout-button";

export default async function DashboardPage() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    redirect("/login");
  }

  let email: string;
  try {
    const session = await verifySessionToken(token);
    email = session.email;
  } catch {
    redirect("/login");
  }

  return (
    <main className="min-h-full bg-background px-6 py-16 text-on-surface">
      <div className="mx-auto max-w-2xl">
        <p className="text-sm font-medium uppercase tracking-wider text-on-surface-variant">
          Dashboard
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">
          Welcome back
        </h1>
        <p className="mt-4 text-on-surface-variant">
          Signed in as <span className="text-on-surface">{email}</span>. This
          page is protected by middleware and a server-side session check.
        </p>
        <div className="mt-10">
          <DashboardLogoutButton />
        </div>
        <p className="mt-10">
          <Link
            href="/"
            className="text-sm font-medium text-primary-container hover:underline"
          >
            ← Back to home
          </Link>
        </p>
      </div>
    </main>
  );
}
