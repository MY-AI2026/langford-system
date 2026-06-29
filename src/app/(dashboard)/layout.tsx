"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { AppFooter } from "@/components/layout/app-footer";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  return (
    <ProtectedRoute>
      <div className="min-h-screen">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex min-h-screen flex-col lg:pl-64">
          <Topbar onMenuClick={() => setSidebarOpen(true)} />
          {/* Keyed on the route so content fades/slides in on each navigation */}
          <main key={pathname} className="animate-page-in flex-1 p-4 lg:p-6">
            {children}
          </main>
          <AppFooter />
        </div>
      </div>
    </ProtectedRoute>
  );
}
