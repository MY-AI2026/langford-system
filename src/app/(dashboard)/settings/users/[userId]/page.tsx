"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { RoleGate } from "@/components/auth/role-gate";
import { PageHeader } from "@/components/layout/page-header";
import { useAuth } from "@/contexts/auth-context";
import { getUser, updateUser, deleteUser } from "@/lib/services/user-service";
import { resetPassword } from "@/lib/firebase/auth";
import { User, UserRole } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Trash2, Mail } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/language-context";

export default function EditUserPage() {
  return (
    <RoleGate allowedRoles={["admin"]}>
      <EditUserContent />
    </RoleGate>
  );
}

function EditUserContent() {
  const params = useParams();
  const router = useRouter();
  const { t } = useLanguage();
  const { firebaseUser } = useAuth();
  const userId = params.userId as string;
  const isSelf = firebaseUser?.uid === userId;

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<UserRole>("sales");
  const [phone, setPhone] = useState("");
  const [monthlyTarget, setMonthlyTarget] = useState(0);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await getUser(userId);
      if (data) {
        setUser(data);
        setDisplayName(data.displayName);
        setRole(data.role);
        setPhone(data.phone || "");
        setMonthlyTarget(data.monthlyTarget);
        setIsActive(data.isActive);
      }
      setLoading(false);
    }
    load();
  }, [userId]);

  async function handleSave() {
    setSaving(true);
    try {
      await updateUser(userId, {
        displayName,
        role,
        phone,
        monthlyTarget,
        isActive,
      });
      toast.success(t("userUpdated"));
      router.push("/settings/users");
    } catch {
      toast.error(t("failedToUpdateUser"));
    } finally {
      setSaving(false);
    }
  }

  async function handleSendPasswordReset() {
    if (!user) return;
    setSendingReset(true);
    try {
      await resetPassword(user.email);
      toast.success(`${t("passwordResetEmailSentTo")} ${user.email}`);
    } catch {
      toast.error(t("failedToSendPasswordReset"));
    } finally {
      setSendingReset(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!user) {
    return <p className="text-muted-foreground">{t("userNotFound")}</p>;
  }

  return (
    <div className="space-y-6">
      <PageHeader title={`${t("edit")}: ${user.displayName}`} />
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("fullName")}</Label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>{t("email")}</Label>
                <Input value={user.email} disabled />
              </div>

              <div className="space-y-2">
                <Label>{t("role")}</Label>
                <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">{t("admin")}</SelectItem>
                    <SelectItem value="coordinator">{t("administrativeCoordinator")}</SelectItem>
                    <SelectItem value="sales">{t("sales")}</SelectItem>
                    <SelectItem value="instructor">{t("instructor")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t("phone")}</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>{t("monthlyTarget")} (KWD)</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={monthlyTarget}
                  onChange={(e) => setMonthlyTarget(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="flex items-center gap-3 pt-6">
                <Switch
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
                <Label>{t("active")}</Label>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                  disabled={isSelf}
                  title={isSelf ? t("cannotDeleteOwnAccount") : undefined}
                >
                  <Trash2 className="me-2 h-4 w-4" />
                  {t("deleteUser")}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSendPasswordReset}
                  disabled={sendingReset}
                >
                  {sendingReset
                    ? <Loader2 className="me-2 h-4 w-4 animate-spin" />
                    : <Mail className="me-2 h-4 w-4" />}
                  {t("resetPassword")}
                </Button>
              </div>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                {t("saveChanges")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen && !isSelf} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteUserPermanentlyQuestion")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("deleteUserPermanentlyPrefix")} <strong>{user.displayName}</strong> ({user.email}).
            {" "}{t("deleteUserPermanentlySuffix")}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {t("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                try {
                  await deleteUser(userId);
                  toast.success(t("userDeleted"));
                  router.push("/settings/users");
                } catch {
                  toast.error(t("failedToDeleteUser"));
                }
              }}
            >
              {t("deletePermanently")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
