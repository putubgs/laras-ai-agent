import Sidebar from "@/components/dashboard/Sidebar";
import { requireDashboardUser } from "@/lib/auth/dashboard-session";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

function buildSidebarGreeting(fullNameRaw: string | null | undefined, email: string): string {
  const fullName = (fullNameRaw ?? "").trim();
  if (!fullName) {
    const local = email.split("@")[0]?.trim() || "there";
    return `Hi, ${local}`;
  }
  const space = fullName.indexOf(" ");
  if (space === -1) {
    return `Hi, ${fullName}`;
  }
  const first = fullName.slice(0, space).trim();
  const rest = fullName.slice(space + 1).trim();
  return rest ? `Hi, ${first} ${rest}` : `Hi, ${first}`;
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId, email } = await requireDashboardUser();
  const supabase = createServiceRoleClient();
  const { data: userRow } = await supabase
    .from("users")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle();

  const userGreeting = buildSidebarGreeting(userRow?.full_name as string | undefined, email);

  return (
    <div className="min-h-screen bg-background text-on-surface">
      <Sidebar userGreeting={userGreeting} />
      <main className="ml-64 min-h-screen">{children}</main>
    </div>
  );
}
