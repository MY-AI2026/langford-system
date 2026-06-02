"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { REG_ROUTES } from "@/lib/registration/constants";
import { UserRole } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogOut, Menu, UserPlus, ListChecks } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** Agent navigation only — the registration shell is dedicated to the
 * Acceptix agent surface (English-only). Admin lives in the main Langford
 * dashboard at `/acceptix/*` and never sees this shell. */
function navLinksForRole(role: UserRole | null): NavLink[] {
  if (role === "acceptix_agent" || role === "admin") {
    return [
      { href: REG_ROUTES.registerStudent, label: "Register Student", icon: UserPlus },
      { href: REG_ROUTES.myStudents, label: "My Students", icon: ListChecks },
    ];
  }
  return [];
}

export function RegistrationShell({ children }: { children: React.ReactNode }) {
  const { role, userData } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const links = navLinksForRole(role);
  const homeHref =
    role === "admin"
      ? "/dashboard"
      : role === "acceptix_agent"
        ? REG_ROUTES.registerStudent
        : "/";

  async function handleLogout() {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (e) {
      console.error("[registration-shell] sign out failed:", e);
    }
  }

  return (
    <div className="min-h-screen bg-background" dir="ltr">
      {/* ── Topbar — dual brand (Acceptix + Langford) ──────────────────────── */}
      <header className="sticky top-0 z-30 border-b bg-card/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            {/* Mobile menu trigger */}
            {links.length > 0 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  onClick={() => setDrawerOpen(true)}
                  aria-label="Menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
                <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
                  <SheetContent side="left" className="w-64 p-0">
                    <SheetTitle className="sr-only">Navigation</SheetTitle>
                    <SidebarBody
                      links={links}
                      pathname={pathname}
                      onLinkClick={() => setDrawerOpen(false)}
                    />
                  </SheetContent>
                </Sheet>
              </>
            )}

            <Link href={homeHref} className="flex items-center gap-3">
              <Image
                src="/acceptix-logo.png"
                alt="Acceptix"
                width={36}
                height={36}
                className="rounded-md"
                priority
              />
              <div className="hidden flex-col leading-tight sm:flex">
                <span className="text-sm font-semibold text-foreground">
                  Acceptix
                </span>
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Registration Portal
                </span>
              </div>
            </Link>

            <div className="hidden h-8 w-px bg-border sm:block" />

            {/* Langford "powered by" — subtle */}
            <div className="hidden items-center gap-2 sm:flex">
              <Image
                src="/logo.png"
                alt="Langford"
                width={28}
                height={28}
                className="opacity-80"
              />
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Powered by Langford
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {userData?.displayName && (
              <span className="hidden text-sm text-muted-foreground md:inline">
                {userData.displayName}
              </span>
            )}
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Body: sidebar (desktop) + content ──────────────────────────────── */}
      <div className="mx-auto flex max-w-7xl">
        {links.length > 0 && (
          <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-60 shrink-0 border-r lg:block">
            <SidebarBody links={links} pathname={pathname} />
          </aside>
        )}
        <main className="min-w-0 flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

function SidebarBody({
  links,
  pathname,
  onLinkClick,
}: {
  links: NavLink[];
  pathname: string;
  onLinkClick?: () => void;
}) {
  return (
    <nav className="flex h-full flex-col gap-1 p-4">
      {links.map((link) => {
        const Icon = link.icon;
        const active =
          pathname === link.href || pathname.startsWith(link.href + "/");
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onLinkClick}
            className={[
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            ].join(" ")}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="h-4 w-4" />
            <span>{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
