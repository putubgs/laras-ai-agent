import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySessionToken } from "@/lib/auth/session";

export type DashboardUser = {
  userId: string;
  email: string;
};

/**
 * Resolves the signed-in user for dashboard server components / actions.
 * Redirects to login if missing or invalid.
 */
export async function requireDashboardUser(): Promise<DashboardUser> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    redirect("/login?from=/dashboard");
  }
  try {
    const { sub, email } = await verifySessionToken(token);
    return { userId: sub, email };
  } catch {
    redirect("/login?from=/dashboard");
  }
}
