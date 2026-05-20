"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "@/lib/firebase/auth";
import { logUserLogin } from "@/lib/services/user-service";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { loginSchema, LoginFormData } from "@/lib/utils/validators";
import { REG_ROUTES } from "@/lib/registration/constants";
import { UserRole } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";

/**
 * Acceptix portal login form. Behaviour mirrors the main Langford login,
 * but:
 *   - admin lands on /registration/admin (not /dashboard) — they came
 *     in through the Acceptix front door, so we keep them inside it.
 *   - acceptix_agent lands on /registration/register-student.
 *   - Any other Langford role (sales, instructor, coordinator,
 *     accountant) is rejected with a friendly Arabic message; they
 *     should sign in through the main /login page instead.
 *
 * Light/neutral styling so we can drop it onto the white Acceptix
 * portal page without inheriting the dark Langford gradient styles.
 */
export function AcceptixLoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginFormData) {
    setError("");
    try {
      const result = await signIn(data.email, data.password);

      // Look up role + isActive before deciding where to send them.
      const userDoc = await getDoc(doc(db, "users", result.user.uid));
      const userData = userDoc.exists() ? userDoc.data() : null;
      const role = (userData?.role as UserRole) ?? null;
      const isActive = (userData?.isActive as boolean | undefined) ?? true;
      const userName =
        (userData?.displayName as string) || data.email || "Acceptix user";

      // Log the login (best-effort).
      try {
        await logUserLogin(result.user.uid, userName, data.email);
      } catch {
        /* swallow */
      }

      if (!isActive) {
        setError("حسابك معطّل — تواصل مع إدارة Langford.");
        return;
      }

      if (role === "acceptix_agent") {
        router.push(REG_ROUTES.registerStudent);
        return;
      }
      if (role === "admin") {
        router.push(REG_ROUTES.adminDashboard);
        return;
      }

      // Any other Langford role hit the Acceptix portal by mistake.
      setError(
        "البوابة دي مخصّصة لموظفي Acceptix. لو إنت من فريق Langford ادخل من https://langford-system.vercel.app/login"
      );
    } catch {
      setError("الإيميل أو كلمة المرور غير صحيحين.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" dir="rtl">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="ac-email">الإيميل</Label>
        <Input
          id="ac-email"
          type="email"
          placeholder="agent@acceptix.com"
          autoComplete="email"
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
        <Label htmlFor="ac-password">كلمة المرور</Label>
        <Input
          id="ac-password"
          type="password"
          placeholder="••••••••••••"
          autoComplete="current-password"
          dir="ltr"
          className="text-left"
          {...register("password")}
          aria-invalid={!!errors.password}
        />
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="ml-2 h-4 w-4 animate-spin" />
            جاري الدخول…
          </>
        ) : (
          "دخول"
        )}
      </Button>
    </form>
  );
}
