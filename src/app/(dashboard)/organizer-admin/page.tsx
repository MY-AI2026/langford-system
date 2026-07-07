"use client";

import { useCallback, useEffect, useState } from "react";
import { RoleGate } from "@/components/auth/role-gate";
import { PageHeader } from "@/components/layout/page-header";
import { fetchCollection } from "@/lib/firebase/rest-helpers";
import { createUser, updateUser } from "@/lib/services/user-service";
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
import { UserPlus, Users, Power, PowerOff, Loader2, EyeOff } from "lucide-react";

/**
 * SECRET, UNLISTED provisioning page for Academic-Organizer accounts.
 *
 * Deliberately NOT linked from any sidebar/menu — reachable only by typing
 * `/organizer-admin` directly. The portal itself is invisible to everyone in
 * the normal system (including other admins browsing menus); this page is the
 * only surface that references it, and it lives behind an admin RoleGate
 * because provisioning a user still needs admin permissions.
 *
 * Fully client-side (Identity Toolkit signUp + Firestore REST) — no Cloud
 * Function deploy required.
 */

async function fetchOrganizers(): Promise<User[]> {
  const rows = await fetchCollection("users");
  return rows
    .map((r) => ({ ...r, uid: r.id }) as User)
    .filter((u) => u.role === "academic_organizer");
}

function OrganizerAdminContent() {
  const [organizers, setOrganizers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);
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
    if (fullName.trim().length < 2) return toast.error("اكتب اسم صحيح");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      return toast.error("إيميل غير صحيح");
    if (password.length < 6) return toast.error("الباسورد لازم 6 حروف على الأقل");

    setCreating(true);
    try {
      await createUser({
        email: email.trim(),
        password,
        displayName: fullName.trim(),
        role: "academic_organizer",
        phone: phone.trim(),
        monthlyTarget: 0,
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
      await updateUser(u.uid, { isActive: nextActive });
      toast.success(nextActive ? "تم تفعيل الحساب" : "تم تعطيل الحساب");
      refresh();
    } catch (e) {
      const err = e as { message?: string };
      toast.error(err.message || "تعذّر تغيير الحالة");
    } finally {
      setTogglingUid(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="المنظّمون الأكاديميون (سرّي)"
        description="صفحة مستترة لإنشاء وإدارة حسابات بورتال المنظّم الأكاديمي. مش مدرجة في أي منيو."
        action={
          <Button onClick={() => setCreateOpen(true)}>
            <UserPlus className="ms-2 h-4 w-4" />
            منظّم جديد
          </Button>
        }
      />

      <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/40 p-3 text-xs text-muted-foreground">
        <EyeOff className="h-4 w-4 shrink-0" />
        البورتال ده مخفي عن الجميع. الوصول ليه بس عن طريق تسجيل الدخول بحساب منظّم على <code>/organizer</code>.
      </div>

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
                <TableHead className="w-32"></TableHead>
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
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

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
              <Label>الإيميل (اليوزر)</Label>
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
              <p className="text-xs text-muted-foreground">6 حروف على الأقل.</p>
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
    </div>
  );
}

export default function OrganizerAdminPage() {
  return (
    <RoleGate allowedRoles={["admin"]}>
      <OrganizerAdminContent />
    </RoleGate>
  );
}
