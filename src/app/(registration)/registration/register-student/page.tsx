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

      toast.success("Student registered successfully ✓", {
        description: `${data.fullName} has been added — view them under "My Students".`,
        action: {
          label: "View My Students",
          onClick: () => router.push(REG_ROUTES.myStudents),
        },
        duration: 6000,
      });
    } catch (error) {
      if (error instanceof Error) {
        switch (error.message) {
          case "PHONE_INVALID":
            toast.error("Invalid phone number — must be at least 7 digits.");
            return;
          case "COURSE_NOT_FOUND":
            toast.error("Course not found — please refresh and try again.");
            return;
          case "COURSE_INACTIVE":
            toast.error("That course is not available right now — pick another.");
            return;
        }
      }
      console.error("[register-student] failed:", error);
      toast.error("Unexpected error — please try again.");
    }
  }

  return (
    <div className="space-y-6" dir="ltr">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <UserPlus className="h-6 w-6 text-primary" />
            Register a New Student
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Fill in the student details and pick a course. You will see the
            commission preview before submitting.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(REG_ROUTES.myStudents)}
        >
          <ListChecks className="mr-2 h-4 w-4" />
          My Students
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Student Details</CardTitle>
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
