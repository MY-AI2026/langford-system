"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { PageHeader } from "@/components/layout/page-header";
import { StudentForm } from "@/components/students/student-form";
import { createStudent } from "@/lib/services/student-service";
import { getSalesUsers } from "@/lib/services/user-service";
import { StudentFormData } from "@/lib/utils/validators";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

export default function NewStudentPage() {
  const router = useRouter();
  const { firebaseUser, userData } = useAuth();

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

      toast.success("Student created successfully");
      router.push(`/students/${studentId}`);
    } catch (error) {
      toast.error("Failed to create student");
      console.error(error);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add New Student"
        description="Enter the student's information"
      />
      <Card>
        <CardContent className="pt-6">
          <StudentForm onSubmit={handleSubmit} submitLabel="Create Student" />
        </CardContent>
      </Card>
    </div>
  );
}
