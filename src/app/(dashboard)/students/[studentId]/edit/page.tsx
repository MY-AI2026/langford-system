"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { PageHeader } from "@/components/layout/page-header";
import { StudentForm } from "@/components/students/student-form";
import { getStudent, updateStudent } from "@/lib/services/student-service";
import { getSalesUsers } from "@/lib/services/user-service";
import { Student } from "@/lib/types";
import { StudentFormData } from "@/lib/utils/validators";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export default function EditStudentPage() {
  const params = useParams();
  const router = useRouter();
  const { firebaseUser, userData } = useAuth();
  const studentId = params.studentId as string;
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await getStudent(studentId);
      setStudent(data);
      setLoading(false);
    }
    load();
  }, [studentId]);

  async function handleSubmit(data: StudentFormData) {
    if (!firebaseUser || !userData || !student) return;

    try {
      const salesUsers = await getSalesUsers();
      const salesRep = salesUsers.find((u) => u.uid === data.assignedSalesRepId);

      const changes: Record<string, { from: unknown; to: unknown }> = {};
      if (data.fullName !== student.fullName) changes.fullName = { from: student.fullName, to: data.fullName };
      if (data.phone !== student.phone) changes.phone = { from: student.phone, to: data.phone };
      if (data.leadSource !== student.leadSource) changes.leadSource = { from: student.leadSource, to: data.leadSource };

      await updateStudent(
        studentId,
        {
          fullName: data.fullName,
          phone: data.phone,
          email: data.email || "",
          leadSource: data.leadSource,
          assignedSalesRepId: data.assignedSalesRepId,
          assignedSalesRepName: salesRep?.displayName || student.assignedSalesRepName,
        } as Partial<Student>,
        firebaseUser.uid,
        userData.displayName,
        changes
      );

      toast.success("Student updated");
      router.push(`/students/${studentId}`);
    } catch {
      toast.error("Failed to update student");
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!student) {
    return <p className="text-muted-foreground">Student not found</p>;
  }

  return (
    <div className="space-y-6">
      <PageHeader title={`Edit: ${student.fullName}`} />
      <Card>
        <CardContent className="pt-6">
          <StudentForm
            defaultValues={{
              fullName: student.fullName,
              phone: student.phone,
              email: student.email || "",
              leadSource: student.leadSource,
              assignedSalesRepId: student.assignedSalesRepId,
            }}
            onSubmit={handleSubmit}
            submitLabel="Update Student"
          />
        </CardContent>
      </Card>
    </div>
  );
}
