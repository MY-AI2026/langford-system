import Image from "next/image";
import { LoginForm } from "@/components/auth/login-form";

/**
 * "Dark Premium" sign-in screen — always rendered in the branded dark look
 * (black canvas + red glow + glass card), independent of the app theme,
 * since it's the first brand impression and runs before a theme is resolved.
 */
export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#080808] p-4">
      {/* Red radial glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-[60%] rounded-full blur-2xl"
        style={{
          background:
            "radial-gradient(circle, rgba(200,36,46,0.30) 0%, rgba(200,36,46,0) 70%)",
        }}
      />
      {/* Faint grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage:
            "radial-gradient(circle at center, black, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(circle at center, black, transparent 75%)",
        }}
      />

      <div className="animate-page-in relative z-10 w-full max-w-md">
        <div className="mb-7 flex flex-col items-center">
          <Image
            src="/logo.png"
            alt="Langford International Institute"
            width={200}
            height={74}
            className="h-[60px] w-auto brightness-0 invert"
            priority
          />
          <p className="mt-3 text-xs uppercase tracking-[0.15em] text-gray-400">
            Student Management System
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-[0_30px_80px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
          <h1 className="text-center text-2xl font-bold text-gray-50">
            Sign in
          </h1>
          <p className="mb-7 mt-1.5 text-center text-sm text-gray-400">
            Welcome back — please enter your details.
          </p>
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-xs text-gray-500">
          Langford International Institute · In Kuwait
        </p>
        <p className="mt-2 text-center text-[11px] text-gray-600">
          Powered by{" "}
          <span className="font-semibold text-gray-300">ENG.Ahmad Alsayed</span>
        </p>
      </div>
    </div>
  );
}
