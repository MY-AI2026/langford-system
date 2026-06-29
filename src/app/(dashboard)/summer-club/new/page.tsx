"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";
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
  const { t } = useLanguage();

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
      toast.success(t("studentAddedSuccess"));
      router.push(`/summer-club/${id}`);
    } catch (err) {
      console.error("[summer-club/new] create failed:", err);
      const msg = err instanceof Error ? err.message : String(err);

      if (msg.startsWith("PHONE_DUPLICATE:")) {
        const name = msg.substring("PHONE_DUPLICATE:".length);
        toast.error(`${t("phoneDuplicate")}: ${name}`);
      } else if (msg === "PHONE_INVALID") {
        toast.error(t("phoneInvalid"));
      } else if (msg.startsWith("PHONE_LOOKUP_FAILED")) {
        // Permission / network / auth issue during phone uniqueness check
        toast.error(t("phoneLookupFailed"));
      } else if (msg === "Not authenticated" || msg.includes("UNAUTHENTICATED")) {
        toast.error(t("sessionExpired"));
      } else if (msg.includes("PERMISSION_DENIED")) {
        toast.error(t("noPermissionAddStudent"));
      } else if (!data.assignedSalesRepId) {
        toast.error(t("mustSelectSalesRep"));
      } else {
        // Show the real reason instead of the generic message
        toast.error(`${t("addStudentFailed")}: ${msg}`);
      }
    }
  }

  return (
    <RoleGate allowedRoles={["admin", "sales", "coordinator"]}>
      <div className="space-y-6">
        <PageHeader
          title={t("newSummerClubStudent")}
          description={t("fillStudentData")}
        />
        <Card>
          <CardContent className="pt-6">
            <SummerClubForm onSubmit={handleSubmit} submitLabel={t("saveStudent")} />
          </CardContent>
        </Card>
      </div>
    </RoleGate>
  );
}
