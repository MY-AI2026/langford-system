import Link from "next/link";
import { AcceptixLoginForm } from "@/components/registration/acceptix-login-form";
import { GraduationCap, ShieldCheck, Sparkles, Users } from "lucide-react";

/**
 * Dedicated Acceptix portal login page.
 *
 * URL: /acceptix
 *
 * Visually separated from the Langford internal login — light theme,
 * Acceptix-first branding, Langford appears only as a small "powered by"
 * footer. Agents bookmark this URL; they never hit /login.
 */
export default function AcceptixLoginPage() {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4"
      dir="rtl"
    >
      <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-2 lg:items-center">
        {/* ── Brand panel (desktop only) ───────────────────────────── */}
        <div className="hidden flex-col gap-6 lg:flex">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-600 p-2.5 text-white shadow-lg">
              <GraduationCap className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Acceptix Portal
              </h1>
              <p className="text-sm text-gray-500">
                بوابة تسجيل الطلبة عبر معهد Langford
              </p>
            </div>
          </div>

          <p className="text-base leading-relaxed text-gray-700">
            ادخل بحسابك وسجّل طلبتك في كورسات Langford. تشوف بس الطلبة اللي
            انت سجّلتهم، واتابع حالتهم لحظة بلحظة.
          </p>

          <div className="space-y-3">
            <Feature
              icon={Sparkles}
              title="تسجيل سريع"
              body="فورم بسيط لاختيار الطالب والكورس — بتشوف العمولة 10% قبل ما تأكّد."
            />
            <Feature
              icon={Users}
              title="طلبتي بس"
              body="مفيش طريقة تشوف طلبة موظف تاني — كل واحد يشوف اللي سجّله هو."
            />
            <Feature
              icon={ShieldCheck}
              title="آمن وموثّق"
              body="كل عملية بتتسجّل وبتوصل لإدارة Langford كإشعار فوري."
            />
          </div>
        </div>

        {/* ── Login card ────────────────────────────────────────────── */}
        <div className="mx-auto w-full max-w-md">
          {/* Mobile brand (above the card) */}
          <div className="mb-6 flex flex-col items-center gap-3 text-center lg:hidden">
            <div className="rounded-xl bg-blue-600 p-2.5 text-white shadow-lg">
              <GraduationCap className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Acceptix Portal</h1>
              <p className="text-sm text-gray-500">
                بوابة تسجيل الطلبة عبر معهد Langford
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-7 shadow-xl">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                مرحباً بيك
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                ادخل ببياناتك علشان تبدأ تسجيل الطلبة.
              </p>
            </div>
            <AcceptixLoginForm />
          </div>

          {/* Powered by — Langford as a small footer */}
          <p className="mt-6 text-center text-xs text-gray-500">
            بوابة مدعومة من{" "}
            <Link
              href="https://langford.website"
              className="font-medium text-blue-600 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Langford International Institute
            </Link>
            {" · "}الكويت
          </p>
        </div>
      </div>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white/70 p-3 backdrop-blur">
      <div className="rounded-md bg-blue-50 p-2 text-blue-600">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-gray-600">{body}</p>
      </div>
    </div>
  );
}
