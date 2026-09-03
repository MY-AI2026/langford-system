"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { RoleGate } from "@/components/auth/role-gate";
import { PageHeader } from "@/components/layout/page-header";
import { createUser } from "@/lib/services/user-service";
import { userSchema, UserFormData } from "@/lib/utils/validators";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/language-context";

export default function NewUserPage() {
  return (
    <RoleGate allowedRoles={["admin"]}>
      <NewUserContent />
    </RoleGate>
  );
}

function NewUserContent() {
  const router = useRouter();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UserFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(userSchema) as any,
    defaultValues: {
      email: "",
      displayName: "",
      role: "sales",
      phone: "",
      monthlyTarget: 0,
      password: "",
    },
  });

  async function onSubmit(data: UserFormData) {
    setIsLoading(true);
    try {
      await createUser({
        email: data.email,
        password: data.password,
        displayName: data.displayName,
        role: data.role,
        phone: data.phone,
        monthlyTarget: data.monthlyTarget,
      });
      toast.success(t("userCreatedSuccessfully"));
      router.push("/settings/users");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("failedToCreateUser");
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  // Surface validation failures instead of silently doing nothing — a field
  // with no error UI (e.g. monthlyTarget) could otherwise block submit
  // invisibly, so clicking "Create User" appeared to do nothing.
  function onInvalid(formErrors: FieldErrors<UserFormData>) {
    const firstMsg = Object.values(formErrors).find((e) => e?.message)?.message as
      | string
      | undefined;
    toast.error(firstMsg ?? "راجع البيانات المدخلة");
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("addNewUser")} />
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="displayName">{t("fullName")} *</Label>
                <Input id="displayName" {...register("displayName")} />
                {errors.displayName && (
                  <p className="text-sm text-destructive">
                    {errors.displayName.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t("email")} *</Label>
                <Input id="email" type="email" {...register("email")} />
                {errors.email && (
                  <p className="text-sm text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t("password")} *</Label>
                <Input
                  id="password"
                  type="password"
                  {...register("password")}
                />
                {errors.password && (
                  <p className="text-sm text-destructive">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>{t("role")} *</Label>
                <Select
                  value={watch("role")}
                  onValueChange={(val) =>
                    setValue("role", val as "admin" | "sales" | "instructor" | "coordinator")
                  }
                >
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
                <Label htmlFor="phone">{t("phone")}</Label>
                <Input id="phone" {...register("phone")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="monthlyTarget">{t("monthlyTarget")} (KWD)</Label>
                <Input
                  id="monthlyTarget"
                  type="number"
                  step="0.001"
                  {...register("monthlyTarget", {
                    // RHF hands <input type="number"> value as a STRING; the
                    // schema expects a number. Convert here (empty => 0) so
                    // validation doesn't fail silently and block the submit.
                    setValueAs: (v) =>
                      v === "" || v === null || v === undefined ? 0 : Number(v),
                  })}
                />
                {errors.monthlyTarget && (
                  <p className="text-sm text-destructive">
                    {errors.monthlyTarget.message}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={isLoading}>
                {isLoading && (
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                )}
                {t("createUser")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
