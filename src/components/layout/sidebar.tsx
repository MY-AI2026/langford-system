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
  CalendarDays,
  FileCheck,
  Wallet,
  Sun,
  Handshake,
  UserPlus,
  FileBarChart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFollowupCount } from "@/hooks/use-followup-count";
import { useLanguage } from "@/contexts/language-context";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  showFollowupBadge?: boolean;
}

interface NavSection {
  /** Optional section heading; omit for an ungrouped block. */
  label?: string;
  items: NavItem[];
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { role } = useAuth();
  const followupCount = useFollowupCount();
  const { t } = useLanguage();

  // Navigation is grouped into labelled sections so long role menus (admin
  // has 20+ links) read as organised blocks instead of one flat scroll.
  const adminNavSections: NavSection[] = [
    {
      label: t("dashboard"),
      items: [
        { href: "/dashboard", label: t("dashboard"), icon: LayoutDashboard },
      ],
    },
    {
      label: t("students"),
      items: [
        { href: "/students", label: t("students"), icon: GraduationCap, showFollowupBadge: true },
        { href: "/pipeline", label: t("pipeline"), icon: Kanban },
        { href: "/payments", label: t("payments"), icon: CreditCard },
        { href: "/payments/embassy", label: "Embassy Transfers", icon: FileCheck },
      ],
    },
    {
      label: "النادي الصيفي",
      items: [
        { href: "/summer-club", label: "النادي الصيفي", icon: Sun },
        { href: "/reports/summer-club", label: "تقرير النادي الصيفي", icon: Sun },
      ],
    },
    {
      label: "Acceptix",
      items: [
        { href: "/acceptix", label: "Acceptix", icon: Handshake },
        { href: "/acceptix/students", label: "Acceptix Students", icon: GraduationCap },
        { href: "/acceptix/agents", label: "Acceptix Agents", icon: UserPlus },
        { href: "/acceptix/courses", label: "Acceptix Courses", icon: BookOpen },
        { href: "/acceptix/reports", label: "Acceptix Reports", icon: FileBarChart },
        { href: "/acceptix/settings", label: "Acceptix Settings", icon: Settings },
      ],
    },
    {
      label: t("reports"),
      items: [
        { href: "/reports", label: t("reports"), icon: BarChart3 },
        { href: "/reports/outstanding-balances", label: "Outstanding Balances", icon: Wallet },
        { href: "/reports/student-notes", label: "Student Notes", icon: MessageSquare },
        { href: "/reports/logins", label: t("loginReport"), icon: LogIn },
        { href: "/reports/audit", label: t("auditLog"), icon: ShieldCheck },
      ],
    },
    {
      label: t("settings"),
      items: [
        { href: "/settings", label: t("settings"), icon: Settings },
        { href: "/settings/courses", label: t("courses"), icon: BookOpen },
        { href: "/schedule", label: t("schedule"), icon: CalendarDays },
      ],
    },
  ];

  const salesNavSections: NavSection[] = [
    {
      items: [
        { href: "/dashboard", label: t("dashboard"), icon: LayoutDashboard },
        { href: "/students", label: t("students"), icon: GraduationCap, showFollowupBadge: true },
        { href: "/pipeline", label: t("pipeline"), icon: Kanban },
        { href: "/payments", label: t("payments"), icon: CreditCard },
      ],
    },
    {
      label: "النادي الصيفي",
      items: [
        { href: "/summer-club", label: "النادي الصيفي", icon: Sun },
        { href: "/reports/summer-club", label: "تقرير النادي الصيفي", icon: Sun },
      ],
    },
  ];

  const instructorNavSections: NavSection[] = [
    {
      items: [
        { href: "/dashboard", label: t("dashboard"), icon: LayoutDashboard },
        { href: "/schedule", label: t("schedule"), icon: CalendarDays },
        { href: "/attendance", label: t("attendance"), icon: ClipboardCheck },
      ],
    },
  ];

  const coordinatorNavSections: NavSection[] = [
    {
      items: [
        { href: "/dashboard", label: t("dashboard"), icon: LayoutDashboard },
        { href: "/students", label: t("students"), icon: GraduationCap },
        { href: "/settings/courses", label: t("courses"), icon: BookOpen },
        { href: "/schedule", label: t("schedule"), icon: CalendarDays },
        { href: "/attendance", label: t("attendance"), icon: ClipboardCheck },
      ],
    },
    {
      label: "النادي الصيفي",
      items: [
        { href: "/summer-club", label: "النادي الصيفي", icon: Sun },
        { href: "/reports/summer-club", label: "تقرير النادي الصيفي", icon: Sun },
      ],
    },
  ];

  const accountantNavSections: NavSection[] = [
    {
      items: [
        { href: "/dashboard", label: t("dashboard"), icon: LayoutDashboard },
        { href: "/students", label: t("students"), icon: GraduationCap },
        { href: "/payments", label: t("payments"), icon: CreditCard },
        { href: "/payments/embassy", label: "Embassy Transfers", icon: FileCheck },
        { href: "/settings/courses", label: t("courses"), icon: BookOpen },
      ],
    },
    {
      label: "النادي الصيفي",
      items: [
        { href: "/summer-club", label: "النادي الصيفي", icon: Sun },
        { href: "/reports/summer-club", label: "تقرير النادي الصيفي", icon: Sun },
      ],
    },
    {
      label: t("reports"),
      items: [
        { href: "/reports/outstanding-balances", label: "Outstanding Balances", icon: Wallet },
        { href: "/reports/student-notes", label: "Student Notes", icon: MessageSquare },
      ],
    },
  ];

  const navSections =
    role === "admin"
      ? adminNavSections
      : role === "instructor"
        ? instructorNavSections
        : role === "coordinator"
          ? coordinatorNavSections
          : role === "accountant"
            ? accountantNavSections
            : salesNavSections;

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
        <nav className="flex-1 space-y-4 overflow-y-auto p-3 [scrollbar-width:thin]">
          {navSections.map((section, sectionIdx) => (
            <div key={section.label ?? `section-${sectionIdx}`} className="space-y-1">
              {section.label && (
                <p className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/35">
                  {section.label}
                </p>
              )}
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "group/nav relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200",
                      isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    {/* Active accent bar */}
                    <span
                      className={cn(
                        "absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-langford-red transition-all duration-200",
                        isActive ? "opacity-100" : "opacity-0 group-hover/nav:opacity-40"
                      )}
                    />
                    <item.icon className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover/nav:scale-110" />
                    <span className="flex-1">{item.label}</span>
                    {item.showFollowupBadge && followupCount > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                        {followupCount > 99 ? "99+" : followupCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
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
