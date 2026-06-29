"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";
import { PageHeader } from "@/components/layout/page-header";
import { StudentForm } from "@/components/students/student-form";
import { createStudent } from "@/lib/services/student-service";
import { getSalesUsers } from "@/lib/services/user-service";
import { StudentFormData } from "@/lib/utils/validators";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

export default function NewStudentPage() {
  const router = useRouter();
  const { firebaseUser, userData, role } = useAuth();
  const { t } = useLanguage();

  // Accountant is read-only — redirect away from create page
  if (role === "accountant") {
    router.replace("/students");
    return null;
  }

  async function handleSubmit(data: StudentFormData) {
    if (!firebaseUser || !userData) return;

    try {
      // Get the sales rep name
      const salesUsers = await getSalesUsers();
      const salesRep = salesUsers.find(
        (u) => u.uid === data.assignedSalesRepId
      );

      const studentId = await createStudent(
        {
          fullName: data.fullName,
          phone: data.phone,
          email: data.email || "",
          leadSource: data.leadSource,
          assignedSalesRepId: data.assignedSalesRepId,
          assignedSalesRepName:
            salesRep?.displayName || userData.displayName,
        },
        firebaseUser.uid,
        userData.displayName
      );

      toast.success(t("studentCreated"));
      router.push(`/students/${studentId}`);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("PHONE_DUPLICATE:")) {
        const existingName = error.message.substring("PHONE_DUPLICATE:".length);
        toast.error(`${t("phoneDuplicate")}: ${existingName}`);
      } else if (error instanceof Error && error.message === "PHONE_INVALID") {
        toast.error(t("phoneInvalid"));
      } else {
        toast.error(t("failedToAddStudent"));
        console.error(error);
      }
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("addNewStudent")}
        description={t("enterStudentInfo")}
      />
      <Card>
        <CardContent className="pt-6">
          <StudentForm onSubmit={handleSubmit} submitLabel={t("createStudent")} />
        </CardContent>
      </Card>
    </div>
  );
}
