"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase/config";
import { AuditLogEntry } from "@/lib/types";
import { formatDateTime } from "@/lib/utils/format";
import { RoleGate } from "@/components/auth/role-gate";
import { PageHeader } from "@/components/layout/page-header";
import {
  fetchCollection,
  createSubscription,
} from "@/lib/firebase/rest-helpers";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

function AuditLogContent() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait for auth to be ready
    const unsubAuth = auth.onAuthStateChanged((user) => {
      if (!user) return;

      cleanupRef = createSubscription<AuditLogEntry>(
        async () => {
          const results = await fetchCollection(
            "auditLog",
            "timestamp",
            "DESCENDING"
          );
          return results as AuditLogEntry[];
        },
        (data) => {
          setEntries(data);
          setLoading(false);
        },
        5000
      );
    });

    let cleanupRef: (() => void) | null = null;

    return () => {
      unsubAuth();
      if (cleanupRef) cleanupRef();
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-dashed">
        <p className="text-sm text-muted-foreground">No audit log entries found</p>
      </div>
    );
  }

  function getActionVariant(
    action: string
  ): "default" | "secondary" | "destructive" | "outline" {
    if (action === "delete") return "destructive";
    if (action === "create") return "default";
    return "secondary";
  }

  function summariseChanges(
    changes: Record<string, { from: unknown; to: unknown }>
  ): string {
    const keys = Object.keys(changes);
    if (keys.length === 0) return "-";
    return keys
      .slice(0, 3)
      .map((k) => `${k}: ${String(changes[k].from)} → ${String(changes[k].to)}`)
      .join("; ");
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Entity Type</TableHead>
            <TableHead>Entity ID</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Changes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell className="text-xs whitespace-nowrap">
                {formatDateTime(entry.timestamp)}
              </TableCell>
              <TableCell>
                <Badge variant={getActionVariant(entry.action)} className="capitalize">
                  {entry.action}
                </Badge>
              </TableCell>
              <TableCell className="capitalize text-sm">{entry.entityType}</TableCell>
              <TableCell className="font-mono text-xs max-w-28 truncate">
                {entry.entityId}
              </TableCell>
              <TableCell className="text-sm">{entry.userName}</TableCell>
              <TableCell className="text-xs text-muted-foreground max-w-64 truncate">
                {summariseChanges(entry.changes || {})}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function AuditLogPage() {
  return (
    <RoleGate allowedRoles={["admin"]}>
      <div className="space-y-6">
        <PageHeader
          title="Audit Log"
          description="Track all system actions and changes"
        />
        <AuditLogContent />
      </div>
    </RoleGate>
  );
}
