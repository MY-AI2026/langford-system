"use client";

import { RoleGate } from "@/components/auth/role-gate";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Settings2, Database } from "lucide-react";
import Link from "next/link";

export default function SettingsPage() {
  return (
    <RoleGate allowedRoles={["admin"]}>
      <div className="space-y-6">
        <PageHeader
          title="Settings"
          description="System configuration and user management"
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/settings/users">
            <Card className="cursor-pointer transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-blue-50 p-2">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <CardTitle className="text-base">User Management</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Create, edit, and manage system users and their roles
                </p>
              </CardContent>
            </Card>
          </Link>

          <Card className="opacity-60">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-gray-50 p-2">
                  <Settings2 className="h-5 w-5 text-gray-600" />
                </div>
                <CardTitle className="text-base">System Settings</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Configure lead sources, levels, and institute info
              </p>
              <Badge className="mt-2" variant="secondary">Coming Soon</Badge>
            </CardContent>
          </Card>

          <Card className="opacity-60">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-green-50 p-2">
                  <Database className="h-5 w-5 text-green-600" />
                </div>
                <CardTitle className="text-base">Data Export</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Export all data for backup or migration
              </p>
              <Badge className="mt-2" variant="secondary">Coming Soon</Badge>
            </CardContent>
          </Card>
        </div>
      </div>
    </RoleGate>
  );
}
