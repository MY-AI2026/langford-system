"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { PageHeader } from "@/components/layout/page-header";
import { RoleGate } from "@/components/auth/role-gate";
import {
  SummerClubForm,
  SummerClubFormData,
} from "@/components/summer-club/summer-club-form";
import { createSummerClubStudent } from "@/lib/services/summer-club-service";
import { getSalesUsers } from "@/lib/services/user-service";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

export default function NewSummerClubStudentPage() {
  const router = useRouter();
  const { firebaseUser, userData, role } = useAuth();

  async function handleSubmit(data: SummerClubFormData) {
    if (!firebaseUser || !userData) return;

    let salesRepName = userData.displayName;
    if (role !== "sales") {
      const salesUsers = await getSalesUsers();
      const rep = salesUsers.find((u) => u.uid === data.assignedSalesRepId);
      if (rep) salesRepName = rep.displayName;
    }

    try {
      const id = await createSummerClubStudent(
        {
          fullName: data.fullName,
          phone: data.phone,
          gender: data.gender,
          age: data.age,
          guardianName: data.guardianName,
          guardianPhone: data.guardianPhone,
          notes: data.notes,
          isRegistered: data.isRegistered,
          totalFees: data.totalFees,
          assignedSalesRepId: data.assignedSalesRepId,
          assignedSalesRepName: salesRepName,
        },
        firebaseUser.uid,
        userData.displayName
      );
      toast.success("تم إضافة الطالب بنجاح");
      router.push(`/summer-club/${id}`);
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("PHONE_DUPLICATE:")) {
        const name = err.message.substring("PHONE_DUPLICATE:".length);
        toast.error(`رقم التلفون مسجل مسبقاً للطالب: ${name}`);
      } else {
        toast.error("فشل في إضافة الطالب");
        console.error(err);
      }
    }
  }

  return (
    <RoleGate allowedRoles={["admin", "sales", "coordinator"]}>
      <div className="space-y-6">
        <PageHeader
          title="إضافة طالب جديد - النادي الصيفي"
          description="املأ بيانات الطالب"
        />
        <Card>
          <CardContent className="pt-6">
            <SummerClubForm onSubmit={handleSubmit} submitLabel="حفظ الطالب" />
          </CardContent>
        </Card>
      </div>
    </RoleGate>
  );
}
