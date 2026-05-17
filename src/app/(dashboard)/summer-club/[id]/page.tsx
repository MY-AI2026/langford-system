"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { PageHeader } from "@/components/layout/page-header";
import { RoleGate } from "@/components/auth/role-gate";
import {
  SummerClubForm,
  SummerClubFormData,
} from "@/components/summer-club/summer-club-form";
import { SummerClubPayments } from "@/components/summer-club/summer-club-payments";
import {
  getSummerClubStudent,
  updateSummerClubStudent,
  deleteSummerClubStudent,
} from "@/lib/services/summer-club-service";
import { getSalesUsers } from "@/lib/services/user-service";
import { SummerClubStudent } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Trash2, ArrowLeft } from "lucide-react";
import { formatCurrency, formatDate, formatPhone } from "@/lib/utils/format";
import { toast } from "sonner";
import Link from "next/link";

export default function SummerClubStudentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { firebaseUser, userData, role } = useAuth();
  const [student, setStudent] = useState<SummerClubStudent | null>(null);
  const [loading, setLoading] = useState(true);

  const studentId = params?.id as string;

  const load = useCallback(async () => {
    if (!studentId) return;
    const s = await getSummerClubStudent(studentId);
    setStudent(s);
    setLoading(false);
  }, [studentId]);

  useEffect(() => {
    async function fetchStudent() {
      if (!studentId) return;
      const s = await getSummerClubStudent(studentId);
      setStudent(s);
      setLoading(false);
    }
    fetchStudent();
  }, [studentId]);

  const canEdit = role === "admin" || role === "coordinator" ||
    (role === "sales" && student?.assignedSalesRepId === firebaseUser?.uid);

  const canDelete = role === "admin";

  async function handleUpdate(data: SummerClubFormData) {
    if (!firebaseUser || !userData || !student) return;

    let salesRepName = student.assignedSalesRepName;
    if (role !== "sales" && data.assignedSalesRepId !== student.assignedSalesRepId) {
      const salesUsers = await getSalesUsers();
      const rep = salesUsers.find((u) => u.uid === data.assignedSalesRepId);
      if (rep) salesRepName = rep.displayName;
    }

    try {
      await updateSummerClubStudent(
        student.id,
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
      toast.success("تم التحديث");
      await load();
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("PHONE_DUPLICATE:")) {
        const name = err.message.substring("PHONE_DUPLICATE:".length);
        toast.error(`رقم التلفون مسجل مسبقاً للطالب: ${name}`);
      } else {
        toast.error("فشل التحديث");
        console.error(err);
      }
    }
  }

  async function handleDelete() {
    if (!firebaseUser || !userData || !student) return;
    if (!confirm(`حذف الطالب ${student.fullName}؟ كل الدفعات هتتمسح كمان.`)) return;
    try {
      await deleteSummerClubStudent(student.id, firebaseUser.uid, userData.displayName);
      toast.success("تم الحذف");
      router.push("/summer-club");
    } catch (err) {
      toast.error("فشل الحذف");
      console.error(err);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-foreground" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <p className="text-muted-foreground">الطالب غير موجود</p>
        <Link href="/summer-club">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            رجوع
          </Button>
        </Link>
      </div>
    );
  }

  // Sales user trying to view someone else's student
  if (role === "sales" && student.assignedSalesRepId !== firebaseUser?.uid) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <p className="text-muted-foreground">ليس لديك صلاحية لعرض هذا الطالب</p>
        <Link href="/summer-club">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            رجوع
          </Button>
        </Link>
      </div>
    );
  }

  const ps = student.paymentSummary || {
    totalFees: 0,
    amountPaid: 0,
    remainingBalance: 0,
    paymentStatus: "pending" as const,
  };

  return (
    <RoleGate allowedRoles={["admin", "sales", "accountant", "coordinator"]}>
      <div className="space-y-6">
        <PageHeader
          title={student.fullName}
          description={`النادي الصيفي • سجل في ${formatDate(student.registrationDate || student.createdAt)}`}
          action={
            canDelete && (
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                حذف
              </Button>
            )
          }
        />

        {/* Summary cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">التلفون</p>
              <p className="text-lg font-semibold">{formatPhone(student.phone)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">الحالة</p>
              <div className="flex gap-2 mt-1">
                <Badge
                  className={
                    student.gender === "female"
                      ? "bg-pink-100 text-pink-700"
                      : "bg-blue-100 text-blue-700"
                  }
                >
                  {student.gender === "female" ? "أنثى" : "ذكر"}
                </Badge>
                <Badge
                  className={
                    student.isRegistered
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }
                >
                  {student.isRegistered ? "مسجل" : "غير مسجل"}
                </Badge>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">المدفوع / الإجمالي</p>
              <p className="text-lg font-semibold text-emerald-700">
                {formatCurrency(ps.amountPaid)} / {formatCurrency(ps.totalFees)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">المتبقي</p>
              <p className="text-lg font-semibold text-red-700">
                {formatCurrency(ps.remainingBalance)}
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="info">
          <TabsList>
            <TabsTrigger value="info">البيانات</TabsTrigger>
            <TabsTrigger value="payments">المدفوعات</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>بيانات الطالب</CardTitle>
              </CardHeader>
              <CardContent>
                {canEdit ? (
                  <SummerClubForm
                    defaultValues={{
                      fullName: student.fullName,
                      phone: student.phone,
                      gender: student.gender,
                      age: student.age ?? null,
                      guardianName: student.guardianName ?? "",
                      guardianPhone: student.guardianPhone ?? "",
                      notes: student.notes ?? "",
                      isRegistered: student.isRegistered,
                      totalFees: ps.totalFees,
                      assignedSalesRepId: student.assignedSalesRepId,
                    }}
                    onSubmit={handleUpdate}
                    submitLabel="تحديث البيانات"
                  />
                ) : (
                  <ReadOnlyView student={student} />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="mt-4">
            <SummerClubPayments
              student={student}
              canEdit={canEdit}
              onChanged={load}
            />
          </TabsContent>
        </Tabs>
      </div>
    </RoleGate>
  );
}

function ReadOnlyView({ student }: { student: SummerClubStudent }) {
  const rows: Array<[string, string]> = [
    ["الاسم", student.fullName],
    ["التلفون", formatPhone(student.phone)],
    ["النوع", student.gender === "female" ? "أنثى" : "ذكر"],
    ["السن", student.age?.toString() ?? "—"],
    ["ولي الأمر", student.guardianName || "—"],
    ["تلفون ولي الأمر", student.guardianPhone ? formatPhone(student.guardianPhone) : "—"],
    ["مسجل", student.isRegistered ? "نعم" : "لا"],
    ["السيلز المسؤول", student.assignedSalesRepName],
    ["تاريخ التسجيل", formatDate(student.registrationDate || student.createdAt)],
    ["ملاحظات", student.notes || "—"],
  ];

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label} className="flex flex-col">
          <span className="text-xs text-muted-foreground">{label}</span>
          <span className="text-sm">{value}</span>
        </div>
      ))}
    </div>
  );
}
