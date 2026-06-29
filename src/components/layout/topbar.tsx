"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { signOut } from "@/lib/firebase/auth";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Menu, LogOut, KeyRound, Search } from "lucide-react";
import { GlobalSearch } from "@/components/layout/global-search";
import { NotificationBell } from "@/components/registration/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { useLanguage } from "@/contexts/language-context";

interface TopbarProps {
  onMenuClick: () => void;
}

/** Human-readable title for the current route, shown on the left of the topbar
 * so the user always knows where they are. Falls back to a humanised segment. */
function derivePageTitle(pathname: string): string {
  const map: Record<string, string> = {
    dashboard: "Dashboard",
    students: "Students",
    pipeline: "Pipeline",
    payments: "Payments",
    embassy: "Embassy Transfers",
    "summer-club": "Summer Club",
    acceptix: "Acceptix",
    agents: "Agents",
    courses: "Courses",
    reports: "Reports",
    "outstanding-balances": "Outstanding Balances",
    "student-notes": "Student Notes",
    logins: "Login Report",
    audit: "Audit Log",
    settings: "Settings",
    schedule: "Schedule",
    attendance: "Attendance",
    profile: "My Profile",
    new: "New",
    edit: "Edit",
  };
  const segments = pathname.split("/").filter(Boolean);
  // Walk from the end, skipping dynamic id-like segments, to the first known label.
  for (let i = segments.length - 1; i >= 0; i--) {
    const seg = segments[i];
    if (map[seg]) return map[seg];
  }
  const last = segments[segments.length - 1] ?? "";
  if (!last) return "Dashboard";
  return last
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { userData, role: userRole } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { language, setLanguage, t } = useLanguage();
  const [searchOpen, setSearchOpen] = useState(false);
  const pageTitle = derivePageTitle(pathname);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  const initials = userData?.displayName
    ? userData.displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <>
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur lg:px-6">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <h1 className="hidden text-base font-semibold lg:block">{pageTitle}</h1>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="hidden md:flex items-center gap-2 text-muted-foreground"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="h-4 w-4" />
            <span className="text-sm">{t("search")}</span>
            <kbd className="pointer-events-none ms-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setSearchOpen(true)}
            title="Search"
          >
            <Search className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLanguage(language === "en" ? "ar" : "en")}
            className="font-medium text-xs"
          >
            {language === "en" ? "AR" : "EN"}
          </Button>
          <ThemeToggle />
          {userRole === "admin" && <NotificationBell />}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted outline-none">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-langford-red text-white text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="hidden text-start md:block">
              <p className="text-sm font-medium">
                {userData?.displayName || "User"}
              </p>
              <Badge
                variant="secondary"
                className="h-5 text-[10px] capitalize"
              >
                {userRole || "..."}
              </Badge>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">
                {userData?.displayName}
              </p>
              <p className="text-xs text-muted-foreground">
                {userData?.email}
              </p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/profile")}>
              <KeyRound className="me-2 h-4 w-4" />
              Change Password
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
              <LogOut className="me-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
    </>
  );
}
