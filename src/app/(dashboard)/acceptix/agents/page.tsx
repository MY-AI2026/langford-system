"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { RoleGate } from "@/components/auth/role-gate";
import {
  subscribeToAcceptixAgents,
  setAgentActive,
  resetAgentPassword,
} from "@/lib/services/reg-agent-service";
import { subscribeToAllStudents } from "@/lib/services/reg-student-service";
import { regAgentResetPasswordSchema } from "@/lib/utils/validators";
import { User, RegStudent } from "@/lib/types";
import { REG_ROUTES } from "@/lib/registration/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  UserPlus,
  Users,
  Key,
  PowerOff,
  Power,
  Loader2,
} from "lucide-react";

function AdminAgentsContent() {
  const [agents, setAgents] = useState<User[]>([]);
  const [students, setStudents] = useState<RegStudent[]>([]);
  const [loading, setLoading] = useState(true);

  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [resetPw, setResetPw] = useState("");
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [togglingUid, setTogglingUid] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeToAcceptixAgents((data) => {
      setAgents(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = subscribeToAllStudents({}, setStudents);
    return () => unsub();
  }, []);

  // Count active (non-deleted) students per agent
  const countByAgent = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of students) {
      m.set(s.createdBy, (m.get(s.createdBy) ?? 0) + 1);
    }
    return m;
  }, [students]);

  async function handleToggle(agent: User) {
    setTogglingUid(agent.uid);
    try {
      const nextActive = !(agent.isActive !== false);
      await setAgentActive(agent.uid, nextActive);
      toast.success(nextActive ? "Account enabled" : "Account disabled");
    } catch (e) {
      const err = e as { message?: string };
      console.error("[admin-agents] toggle failed:", e);
      toast.error(err.message || "Status change failed");
    } finally {
      setTogglingUid(null);
    }
  }

  async function handleResetSubmit() {
    if (!resetTarget) return;
    const parsed = regAgentResetPasswordSchema.safeParse({ password: resetPw });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Invalid password");
      return;
    }

    setResetSubmitting(true);
    try {
      await resetAgentPassword(resetTarget.uid, resetPw);
      toast.success(`New password set for ${resetTarget.displayName}`);
      setResetTarget(null);
      setResetPw("");
    } catch (e) {
      const err = e as { message?: string };
      console.error("[admin-agents] reset password failed:", e);
      toast.error(err.message || "Failed Set Password");
    } finally {
      setResetSubmitting(false);
    }
  }

  return (
    <div className="space-y-6" dir="ltr">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Users className="h-6 w-6 text-primary" />
            Acceptix Agents
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Add new accounts, activate / disable, or reset passwords.
          </p>
        </div>

        <Link href={REG_ROUTES.adminAgentNew}>
          <Button>
            <UserPlus className="ml-2 h-4 w-4" />
            New Agent
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : agents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="mb-3 h-10 w-10 text-muted-foreground" />
            <h3 className="text-base font-semibold">No agents yet</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Start by adding the first Acceptix agent account.
            </p>
            <Link href={REG_ROUTES.adminAgentNew}>
              <Button className="mt-4">
                <UserPlus className="ml-2 h-4 w-4" />
                Add Agent
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Students</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-44"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agents.map((a) => {
                const active = a.isActive !== false;
                return (
                  <TableRow key={a.uid}>
                    <TableCell className="font-medium">{a.displayName}</TableCell>
                    <TableCell dir="ltr" className="text-left">
                      {a.email}
                    </TableCell>
                    <TableCell>
                      {(countByAgent.get(a.uid) ?? 0).toLocaleString("en-US")}
                    </TableCell>
                    <TableCell>
                      {active ? (
                        <Badge className="border-0 bg-green-100 text-green-700">Active</Badge>
                      ) : (
                        <Badge className="border-0 bg-red-100 text-red-700">Disabled</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setResetTarget(a)}
                          aria-label="Reset Password"
                        >
                          <Key className="ml-1 h-4 w-4" />
                          Password
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggle(a)}
                          disabled={togglingUid === a.uid}
                          aria-label={active ? "Disable" : "Enable"}
                        >
                          {togglingUid === a.uid ? (
                            <Loader2 className="ml-1 h-4 w-4 animate-spin" />
                          ) : active ? (
                            <PowerOff className="ml-1 h-4 w-4 text-destructive" />
                          ) : (
                            <Power className="ml-1 h-4 w-4 text-green-600" />
                          )}
                          {active ? "Disable" : "Enable"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Reset password dialog */}
      <Dialog
        open={!!resetTarget}
        onOpenChange={(open) => {
          if (!open) {
            setResetTarget(null);
            setResetPw("");
          }
        }}
      >
        <DialogContent dir="ltr">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>
          {resetTarget && (
            <div className="space-y-3">
              <div className="rounded-md bg-muted/50 p-3 text-sm">
                <p className="font-medium">{resetTarget.displayName}</p>
                <p className="text-xs text-muted-foreground" dir="ltr">
                  {resetTarget.email}
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">New Password</label>
                <Input
                  type="password"
                  value={resetPw}
                  onChange={(e) => setResetPw(e.target.value)}
                  placeholder="At least 12 chars, with digit and special character"
                  dir="ltr"
                  className="text-left"
                />
                <p className="text-xs text-muted-foreground">
                  Required: 12+ chars, uppercase, lowercase, digit, and special character.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setResetTarget(null);
                setResetPw("");
              }}
              disabled={resetSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleResetSubmit} disabled={resetSubmitting}>
              {resetSubmitting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              Set Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminAgentsPage() {
  return (
    <RoleGate allowedRoles={["admin"]}>
      <AdminAgentsContent />
    </RoleGate>
  );
}
