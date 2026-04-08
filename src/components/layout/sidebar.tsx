"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  GraduationCap,
  CreditCard,
  BarChart3,
  Kanban,
  Settings,
  LogIn,
  X,
  ShieldCheck,
  BookOpen,
  ClipboardCheck,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFollowupCount } from "@/hooks/use-followup-count";
import { useLanguage } from "@/contexts/language-context";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { role } = useAuth();
  const followupCount = useFollowupCount();
  const { t } = useLanguage();

  const adminNavItems = [
    { href: "/dashboard", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/students", label: t("students"), icon: GraduationCap, showFollowupBadge: true },
    { href: "/pipeline", label: t("pipeline"), icon: Kanban },
    { href: "/payments", label: t("payments"), icon: CreditCard },
    { href: "/reports", label: t("reports"), icon: BarChart3 },
    { href: "/reports/student-notes", label: "Student Notes", icon: MessageSquare },
    { href: "/reports/logins", label: t("loginReport"), icon: LogIn },
    { href: "/reports/audit", label: t("auditLog"), icon: ShieldCheck },
    { href: "/settings", label: t("settings"), icon: Settings },
    { href: "/settings/courses", label: t("courses"), icon: BookOpen },
  ];

  const salesNavItems = [
    { href: "/dashboard", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/students", label: t("students"), icon: GraduationCap, showFollowupBadge: true },
    { href: "/pipeline", label: t("pipeline"), icon: Kanban },
    { href: "/payments", label: t("payments"), icon: CreditCard },
  ];

  const instructorNavItems = [
    { href: "/dashboard", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/attendance", label: t("attendance"), icon: ClipboardCheck },
  ];

  const coordinatorNavItems = [
    { href: "/dashboard", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/students", label: t("students"), icon: GraduationCap },
    { href: "/settings/courses", label: t("courses"), icon: BookOpen },
  ];

  const accountantNavItems = [
    { href: "/dashboard", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/students", label: t("students"), icon: GraduationCap },
    { href: "/payments", label: t("payments"), icon: CreditCard },
    { href: "/settings/courses", label: t("courses"), icon: BookOpen },
    { href: "/reports/student-notes", label: "Student Notes", icon: MessageSquare },
  ];

  const navItems =
    role === "admin"
      ? adminNavItems
      : role === "instructor"
        ? instructorNavItems
        : role === "coordinator"
          ? coordinatorNavItems
          : role === "accountant"
            ? accountantNavItems
            : salesNavItems;

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform duration-300 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-langford-red">
              <span className="text-sm font-bold text-white">L</span>
            </div>
            <div>
              <span className="text-sm font-semibold">Langford</span>
              <p className="text-xs text-sidebar-foreground/60">Institute</p>
            </div>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                <span className="flex-1">{item.label}</span>
                {(item as { showFollowupBadge?: boolean }).showFollowupBadge && followupCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {followupCount > 99 ? "99+" : followupCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-3">
          <p className="text-center text-xs text-sidebar-foreground/40">
            Langford Student System
          </p>
        </div>
      </aside>
    </>
  );
}
