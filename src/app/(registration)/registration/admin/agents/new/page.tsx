"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { RoleGate } from "@/components/auth/role-gate";
import { createAcceptixAgent } from "@/lib/services/reg-agent-service";
import {
  regAgentCreateSchema,
  RegAgentCreateFormData,
} from "@/lib/utils/validators";
import { REG_ROUTES } from "@/lib/registration/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowRight, Loader2, UserPlus } from "lucide-react";

function NewAgentContent() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegAgentCreateFormData>({
    resolver: zodResolver(regAgentCreateSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      password: "",
    },
  });

  async function onSubmit(data: RegAgentCreateFormData) {
    try {
      const result = await createAcceptixAgent({
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        password: data.password,
      });
      toast.success("تم إنشاء الحساب ✓", {
        description: `${result.fullName} يقدر يدخل دلوقتي بـ ${result.email}`,
        duration: 6000,
      });
      router.push(REG_ROUTES.adminAgents);
    } catch (e) {
      const err = e as { code?: string; message?: string };
      console.error("[new-agent] failed:", err);
      // Cloud Functions HttpsError → message contains the Arabic text we
      // set on the server. Surface it directly.
      toast.error(err.message || "فشل إنشاء الحساب");
    }
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <UserPlus className="h-6 w-6 text-primary" />
            موظف Acceptix جديد
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            أنشئ حساب يدخل ويسجل طلبة. الموظف يقدر يـ login فوراً بالبيانات دي.
          </p>
        </div>

        <Button variant="ghost" size="sm" onClick={() => router.push(REG_ROUTES.adminAgents)}>
          <ArrowRight className="ml-2 h-4 w-4" />
          رجوع للقائمة
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">بيانات الموظف</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fullName">
                  الاسم الكامل <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="fullName"
                  placeholder="اسم الموظف"
                  autoComplete="off"
                  {...register("fullName")}
                  aria-invalid={!!errors.fullName}
                />
                {errors.fullName && (
                  <p className="text-sm text-destructive">{errors.fullName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  الإيميل <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="agent@acceptix.com"
                  autoComplete="off"
                  dir="ltr"
                  className="text-left"
                  {...register("email")}
                  aria-invalid={!!errors.email}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">التليفون (اختياري)</Label>
                <Input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  placeholder="مثال: 9XXXXXXX"
                  autoComplete="off"
                  dir="ltr"
                  className="text-left"
                  {...register("phone")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">
                  كلمة مرور مبدئية <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="12 حرف على الأقل"
                  autoComplete="new-password"
                  dir="ltr"
                  className="text-left"
                  {...register("password")}
                  aria-invalid={!!errors.password}
                />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  لازم: 12+ حرف، حرف كبير، حرف صغير، رقم، ورمز خاص.
                </p>
              </div>
            </div>

            <div className="flex justify-start gap-2 pt-2">
              <Button type="submit" disabled={isSubmitting} size="lg">
                {isSubmitting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                إنشاء الحساب
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => router.push(REG_ROUTES.adminAgents)}
                disabled={isSubmitting}
              >
                إلغاء
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function NewAgentPage() {
  return (
    <RoleGate allowedRoles={["admin"]}>
      <NewAgentContent />
    </RoleGate>
  );
}
