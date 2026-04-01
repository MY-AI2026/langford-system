import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-langford-red">
            <span className="text-2xl font-bold text-white">L</span>
          </div>
          <h1 className="text-2xl font-bold text-white">
            Reset Password
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Enter your email to receive a password reset link
          </p>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 shadow-2xl backdrop-blur">
          <ForgotPasswordForm />
        </div>
      </div>
    </div>
  );
}
