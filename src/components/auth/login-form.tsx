"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn, signInWithGoogle } from "@/lib/firebase/auth";
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
import { AlertCircle, Loader2, Eye, EyeOff } from "lucide-react";
import Link from "next/link";

/**
 * Map a user's role to the landing page they should see after sign-in.
 * Acceptix agents are confined to the registration module — they NEVER
 * land on the main dashboard (which would show them sales/student data
 * they have no business seeing).
 */
function landingRouteForRole(
  role: UserRole | null,
  isActive: boolean
): { href: string; blocked: boolean; reason?: string } {
  if (!isActive) {
    return {
      href: "/login",
      blocked: true,
      reason: "حسابك معطّل — تواصل مع الإدارة.",
    };
  }
  if (role === "acceptix_agent") {
    return { href: REG_ROUTES.registerStudent, blocked: false };
  }
  return { href: "/dashboard", blocked: false };
}

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  async function postSignIn(uid: string, email: string, fallbackName: string) {
    // Fetch the user doc once — we need role + isActive for the redirect
    // decision AND displayName for the login log.
    const userDoc = await getDoc(doc(db, "users", uid));
    const data = userDoc.exists() ? userDoc.data() : null;
    const userName = (data?.displayName as string) || fallbackName;
    const role = (data?.role as UserRole) ?? null;
    const isActive = (data?.isActive as boolean | undefined) ?? true;

    // Log login (non-blocking — auth already succeeded).
    try {
      await logUserLogin(uid, userName, email);
    } catch {
      /* swallow — Firestore logging is best-effort */
    }

    const route = landingRouteForRole(role, isActive);
    if (route.blocked) {
      setError(route.reason ?? "Sign-in blocked.");
      return;
    }
    router.push(route.href);
  }

  async function onSubmit(data: LoginFormData) {
    try {
      setError("");
      const result = await signIn(data.email, data.password);
      await postSignIn(result.user.uid, data.email, data.email);
    } catch {
      setError("Invalid email or password. Please try again.");
    }
  }

  async function handleGoogleSignIn() {
    try {
      setError("");
      const result = await signInWithGoogle();
      await postSignIn(
        result.user.uid,
        result.user.email || "",
        result.user.displayName || result.user.email || ""
      );
    } catch {
      setError("Google sign-in failed. Make sure your account has access.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="email" className="text-gray-300">
          Email
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="Enter your email"
          className="h-11 border-white/15 bg-white/[0.04] text-white placeholder:text-gray-500 focus-visible:border-langford-red focus-visible:ring-langford-red/40"
          {...register("email")}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-gray-300">
          Password
        </Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            className="h-11 border-white/15 bg-white/[0.04] pr-11 text-white placeholder:text-gray-500 focus-visible:border-langford-red focus-visible:ring-langford-red/40"
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-200"
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5" />
            ) : (
              <Eye className="h-5 w-5" />
            )}
          </button>
        </div>
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>

      <Button
        type="submit"
        className="h-11 w-full bg-langford-red text-white shadow-lg shadow-langford-red/30 hover:bg-langford-red/90"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Signing in...
          </>
        ) : (
          "Sign In"
        )}
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-white/10" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-[#141414] px-2 text-gray-400">Or</span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        className="h-11 w-full border-white/15 bg-white/[0.03] text-gray-100 hover:bg-white/[0.08] hover:text-white"
        onClick={handleGoogleSignIn}
      >
        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        Sign in with Google
      </Button>

      <div className="text-center">
        <Link
          href="/forgot-password"
          className="text-sm text-gray-400 transition-colors hover:text-langford-red"
        >
          Forgot your password?
        </Link>
      </div>
    </form>
  );
}
