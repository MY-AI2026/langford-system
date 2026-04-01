import Image from "next/image";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex items-center justify-center">
            <Image
              src="/logo.png"
              alt="Langford International Institute"
              width={220}
              height={90}
              className="brightness-0 invert"
              priority
            />
          </div>
          <p className="mt-1 text-sm text-gray-400">
            Student Management System
          </p>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 shadow-2xl backdrop-blur">
          <h2 className="mb-6 text-center text-lg font-semibold text-white">
            Sign In
          </h2>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
