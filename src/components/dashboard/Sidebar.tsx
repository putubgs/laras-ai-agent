"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  BarChart3,
  Settings,
  FileText,
  Search,
} from "lucide-react";
import { DashboardLogoutButton } from "@/components/auth/dashboard-logout-button";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/applications", label: "Applications", icon: Briefcase },
  { href: "/dashboard/find-job", label: "Find a job", icon: Search },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/cv", label: "My CVs", icon: FileText },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

type SidebarProps = {
  userGreeting: string;
};

export default function Sidebar({ userGreeting }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="laras-glass-strong fixed left-0 top-0 z-30 flex h-full w-64 flex-col border-r border-outline-variant/40">
      <div className="flex items-center gap-3 border-b border-outline-variant/40 px-6 py-5">
        <div className="relative h-9 w-9 flex-shrink-0 overflow-hidden rounded-lg ring-1 ring-outline-variant/50">
          <Image
            src="/laras.png"
            alt="Laras"
            width={36}
            height={36}
            className="h-9 w-9 object-cover"
            priority
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-semibold leading-tight text-on-surface break-words">
            {userGreeting}
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
              <span
                className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_3px_rgba(52,211,153,0.75),0_0_2px_1px_rgba(167,243,208,0.9)]"
                aria-hidden
              />
            </span>
            <span className="text-xs font-medium tracking-wide text-emerald-300">online</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/dashboard"
              ? pathname === "/dashboard" || pathname === "/dashboard/"
              : pathname === href || pathname.startsWith(href + "/");

          return (
            <Link
              key={href}
              href={href}
              className={`font-display flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all ${
                isActive
                  ? "bg-primary/15 text-primary shadow-[inset_0_0_0_1px_rgba(0,218,243,0.35)]"
                  : "text-on-surface-variant hover:bg-surface-container-high/80 hover:text-on-surface"
              }`}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
        <div className="mt-2 border-t border-outline-variant/40 pt-3">
          <DashboardLogoutButton className="w-full" />
        </div>
      </nav>

      <div className="border-t border-outline-variant/40 px-4 py-4">
        <p className="laras-label-caps text-center text-[10px] leading-relaxed text-on-surface-variant/80">
          Built to land your dream role
        </p>
      </div>
    </aside>
  );
}
