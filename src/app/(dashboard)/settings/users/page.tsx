"use client";

import { useEffect, useState } from "react";
import { RoleGate } from "@/components/auth/role-gate";
import { PageHeader } from "@/components/layout/page-header";
import { subscribeToUsers } from "@/lib/services/user-service";
import { User } from "@/lib/types";
import { formatDate, formatCurrency } from "@/lib/utils/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Pencil } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/contexts/language-context";

export default function UsersPage() {
  return (
    <RoleGate allowedRoles={["admin"]}>
      <UsersContent />
    </RoleGate>
  );
}

function UsersContent() {
  const { t } = useLanguage();
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    const unsub = subscribeToUsers(setUsers);
    return () => unsub();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("userManagement")}
        description={`${users.length} ${t("usersCount")}`}
        action={
          <Link href="/settings/users/new">
            <Button>
              <Plus className="me-2 h-4 w-4" />
              {t("addUser")}
            </Button>
          </Link>
        }
      />

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("name")}</TableHead>
              <TableHead>{t("email")}</TableHead>
              <TableHead>{t("role")}</TableHead>
              <TableHead>{t("monthlyTarget")}</TableHead>
              <TableHead>{t("status")}</TableHead>
              <TableHead>{t("created")}</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.uid}>
                <TableCell className="font-medium">
                  {user.displayName}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {user.email}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={user.role === "admin" ? "default" : "secondary"}
                    className="capitalize"
                  >
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  {formatCurrency(user.monthlyTarget)}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={user.isActive ? "default" : "secondary"}
                    className={
                      user.isActive
                        ? "bg-green-100 text-green-700 border-0"
                        : "bg-gray-100 text-gray-500 border-0"
                    }
                  >
                    {user.isActive ? t("active") : t("inactive")}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(user.createdAt)}
                </TableCell>
                <TableCell>
                  <Link href={`/settings/users/${user.uid}`}>
                    <Button variant="ghost" size="icon">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
