"use client";

import { useCallback, useEffect, useState } from "react";
import { RoleGate } from "@/components/auth/role-gate";
import { PageHeader } from "@/components/layout/page-header";
import { fetchCollection } from "@/lib/firebase/rest-helpers";
import {
  callCreateAcademicOrganizer,
  callToggleOrganizerActive,
  callResetOrganizerPassword,
} from "@/lib/firebase/functions";
import { User } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
  Power,
  PowerOff,
  Loader2,
} from "lucide-react";

function strongPasswordError(pw: string): string | null {
  if (pw.length < 12) return "الباسورد لازم 12 حرف على الأقل";
  if (!/[A-Z]/.test(pw)) return "لازم حرف كبير (A-Z)";
  if (!/[a-z]/.test(pw)) return "لازم حرف صغير (a-z)";
  if (!/\d/.test(pw)) return "لازم رقم (0-9)";
  if (!/[^A-Za-z0-9]/.test(pw)) return "لازم رمز خاص (!@#$...)";
  return null;
}

async function fetchOrganizers(): Promise<User[]> {
  const rows = await fetchCollection("users");
  return rows
    .map((r) => ({ ...r, uid: r.id }) as User)
    .filter((u) => u.role === "academic_organizer");
}

function OrganizersContent() {
  const [organizers, setOrganizers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form
  const [createOpen, setCreateOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);

  // Reset / toggle
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [resetPw, setResetPw] = useState("");
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [togglingUid, setTogglingUid] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    fetchOrganizers()
      .then(setOrganizers)
      .catch(() => setOrganizers([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleCreate() {
    if (fullName.trim().length < 2) {
      toast.error("اكتب اسم صحيح");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error("إيميل غير صحيح");
      return;
    }
    const pwErr = strongPasswordError(password);
    if (pwErr) {
      toast.error(pwErr);
      return;
    }
    setCreating(true);
    try {
      await callCreateAcademicOrganizer({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        password,
      });
      toast.success("تم إنشاء حساب المنظّم ✅");
      setCreateOpen(false);
      setFullName("");
      setEmail("");
      setPhone("");
      setPassword("");
      refresh();
    } catch (e) {
      const err = e as { message?: string };
      toast.error(err.message || "تعذّر إنشاء الحساب");
    } finally {
      setCreating(false);
    }
  }

  async function handleToggle(u: User) {
    setTogglingUid(u.uid);
    try {
      const nextActive = !(u.isActive !== false);
      await callToggleOrganizerActive({ uid: u.uid, isActive: nextActive });
      toast.success(nextActive ? "تم تفعيل الحساب" : "تم تعطيل الحساب");
      refresh();
    } catch (e) {
      const err = e as { message?: string };
      toast.error(err.message || "تعذّر تغيير الحالة");
    } finally {
      setTogglingUid(null);
    }
  }

  async function handleResetSubmit() {
    if (!resetTarget) return;
    const pwErr = strongPasswordError(resetPw);
    if (pwErr) {
      toast.error(pwErr);
      return;
    }
    setResetSubmitting(true);
    try {
      await callResetOrganizerPassword({ uid: resetTarget.uid, password: resetPw });
      toast.success(`تم تعيين باسورد جديد لـ ${resetTarget.displayName}`);
      setResetTarget(null);
      setResetPw("");
    } catch (e) {
      const err = e as { message?: string };
      toast.error(err.message || "تعذّر تعيين الباسورد");
    } finally {
      setResetSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="المنظّمون الأكاديميون"
        description="إنشاء وإدارة حسابات بورتال المنظّم الأكاديمي (لكل حساب يوزر وباسور منفصل)."
        action={
          <Button onClick={() => setCreateOpen(true)}>
            <UserPlus className="ms-2 h-4 w-4" />
            منظّم جديد
          </Button>
        }
      />

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : organizers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="mb-3 h-10 w-10 text-muted-foreground" />
            <h3 className="text-base font-semibold">مفيش منظّمين لسه</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              اعمل أول حساب منظّم أكاديمي علشان يقدر يجمّع الطلبة ويعمل الجداول.
            </p>
            <Button className="mt-4" onClick={() => setCreateOpen(true)}>
              <UserPlus className="ms-2 h-4 w-4" />
              إضافة منظّم
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الاسم</TableHead>
                <TableHead>الإيميل</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead className="w-44"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {organizers.map((u) => {
                const active = u.isActive !== false;
                return (
                  <TableRow key={u.uid}>
                    <TableCell className="font-medium">{u.displayName}</TableCell>
                    <TableCell dir="ltr" className="text-start">
                      {u.email}
                    </TableCell>
                    <TableCell>
                      {active ? (
                        <Badge className="border-0 bg-green-100 text-green-700">
                          مفعّل
                        </Badge>
                      ) : (
                        <Badge className="border-0 bg-red-100 text-red-700">
                          معطّل
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setResetTarget(u)}
                        >
                          <Key className="ms-1 h-4 w-4" />
                          الباسورد
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggle(u)}
                          disabled={togglingUid === u.uid}
                        >
                          {togglingUid === u.uid ? (
                            <Loader2 className="ms-1 h-4 w-4 animate-spin" />
                          ) : active ? (
                            <PowerOff className="ms-1 h-4 w-4 text-destructive" />
                          ) : (
                            <Power className="ms-1 h-4 w-4 text-green-600" />
                          )}
                          {active ? "تعطيل" : "تفعيل"}
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

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>منظّم أكاديمي جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>الاسم الكامل</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>الإيميل</Label>
              <Input
                type="email"
                dir="ltr"
                className="text-start"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>التليفون (اختياري)</Label>
              <Input
                dir="ltr"
                className="text-start"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>الباسورد</Label>
              <Input
                type="password"
                dir="ltr"
                className="text-start"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                12 حرف على الأقل، وفيها حرف كبير وصغير ورقم ورمز خاص.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              disabled={creating}
            >
              إلغاء
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating && <Loader2 className="ms-2 h-4 w-4 animate-spin" />}
              إنشاء الحساب
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تعيين باسورد جديد</DialogTitle>
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
                <Label>الباسورد الجديد</Label>
                <Input
                  type="password"
                  dir="ltr"
                  className="text-start"
                  value={resetPw}
                  onChange={(e) => setResetPw(e.target.value)}
                />
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
              إلغاء
            </Button>
            <Button onClick={handleResetSubmit} disabled={resetSubmitting}>
              {resetSubmitting && <Loader2 className="ms-2 h-4 w-4 animate-spin" />}
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function OrganizersAdminPage() {
  return (
    <RoleGate allowedRoles={["admin"]}>
      <OrganizersContent />
    </RoleGate>
  );
}
