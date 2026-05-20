"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { RoleGate } from "@/components/auth/role-gate";
import { RegisterStudentForm } from "@/components/registration/register-student-form";
import { createStudent } from "@/lib/services/reg-student-service";
import { RegStudentFormData } from "@/lib/utils/validators";
import { REG_ROUTES } from "@/lib/registration/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ListChecks, UserPlus } from "lucide-react";

function RegisterStudentContent() {
  const router = useRouter();
  const { firebaseUser, userData, role } = useAuth();

  async function handleSubmit(
    data: RegStudentFormData & { idempotencyKey: string }
  ) {
    if (!firebaseUser || !userData || !role) return;

    try {
      await createStudent(
        {
          fullName: data.fullName,
          phone: data.phone,
          email: data.email,
          courseId: data.courseId,
          notes: data.notes,
          idempotencyKey: data.idempotencyKey,
        },
        {
          uid: firebaseUser.uid,
          displayName: userData.displayName,
          role,
        }
      );

      toast.success("تم تسجيل الطالب بنجاح ✓", {
        description: `${data.fullName} اتسجّل وممكن تشوفه في "طلبتي".`,
        action: {
          label: "اعرض طلبتي",
          onClick: () => router.push(REG_ROUTES.myStudents),
        },
        duration: 6000,
      });
    } catch (error) {
      if (error instanceof Error) {
        switch (error.message) {
          case "PHONE_INVALID":
            toast.error("رقم التليفون مش صحيح — لازم يكون 7 أرقام على الأقل");
            return;
          case "COURSE_NOT_FOUND":
            toast.error("الكورس مش موجود — حدّث الصفحة وحاول تاني");
            return;
          case "COURSE_INACTIVE":
            toast.error("الكورس ده مش متاح حالياً — اختار كورس تاني");
            return;
        }
      }
      console.error("[register-student] failed:", error);
      toast.error("حصل خطأ غير متوقع — حاول مرة تانية");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <UserPlus className="h-6 w-6 text-primary" />
            تسجيل طالب جديد
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            املأ بيانات الطالب واختار الكورس. هتظهر العمولة قبل التسجيل.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(REG_ROUTES.myStudents)}
        >
          <ListChecks className="ml-2 h-4 w-4" />
          طلبتي
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">بيانات الطالب</CardTitle>
        </CardHeader>
        <CardContent>
          <RegisterStudentForm onSubmit={handleSubmit} />
        </CardContent>
      </Card>
    </div>
  );
}

export default function RegisterStudentPage() {
  return (
    <RoleGate allowedRoles={["admin", "acceptix_agent"]}>
      <RegisterStudentContent />
    </RoleGate>
  );
}
