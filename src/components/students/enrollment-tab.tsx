"use client";

import { useEffect, useState } from "react";
import { subscribeToEnrollments, completeEnrollment, deleteEnrollment } from "@/lib/services/enrollment-service";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";
import { Enrollment } from "@/lib/types";
import { formatDate, formatCurrency } from "@/lib/utils/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, CheckCircle2, Award, BookOpen, Clock, GraduationCap, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { EnrollDialog } from "./enroll-dialog";
import { CertificateDialog } from "./certificate-dialog";

interface EnrollmentTabProps {
  studentId: string;
  studentName: string;
  studentCivilId?: string;
  readOnly?: boolean;
}

const STATUS_BADGE_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  completed: "secondary",
  dropped: "destructive",
  on_hold: "outline",
};

const STATUS_LABEL_KEYS: Record<string, string> = {
  active: "active",
  completed: "completed",
  dropped: "dropped",
  on_hold: "onHold",
};

const CATEGORY_LABEL_KEYS: Record<string, string> = {
  general_english: "generalEnglish",
  exam_prep: "examPrep",
  professional: "professional",
  diploma: "diploma",
  esp: "esp",
  conversation: "conversation",
  school: "school",
  other: "other",
};

export function EnrollmentTab({ studentId, studentName, studentCivilId, readOnly = false }: EnrollmentTabProps) {
  const { role, firebaseUser, userData } = useAuth();
  const { t } = useLanguage();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [certDialogOpen, setCertDialogOpen] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState<Enrollment | null>(null);
  const [completing, setCompleting] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeToEnrollments(studentId, (data) => {
      setEnrollments(data);
      setLoading(false);
    });
    return () => unsub();
  }, [studentId]);

  const totalCourses = enrollments.length;
  const activeCourses = enrollments.filter((e) => e.status === "active").length;
  const completedCourses = enrollments.filter((e) => e.status === "completed").length;

  async function handleComplete(enrollment: Enrollment) {
    if (!firebaseUser || !userData) return;
    setCompleting(enrollment.id);
    try {
      await completeEnrollment(studentId, enrollment.id, firebaseUser.uid, userData.displayName);
      toast.success(t("enrollmentCompleted"));
    } catch {
      toast.error(t("failedToCompleteEnrollment"));
    } finally {
      setCompleting(null);
    }
  }

  async function handleDelete(enrollment: Enrollment) {
    if (!firebaseUser || !userData) return;
    if (!confirm(`${t("confirmRemoveEnrollment")} "${enrollment.courseName}"؟`)) return;
    setDeleting(enrollment.id);
    try {
      await deleteEnrollment(
        studentId,
        enrollment.id,
        enrollment.courseName,
        firebaseUser.uid,
        userData.displayName
      );
      toast.success(`${t("removedFrom")} ${enrollment.courseName}`);
    } catch {
      toast.error(t("failedToRemoveEnrollment"));
    } finally {
      setDeleting(null);
    }
  }

  function handleCertificate(enrollment: Enrollment) {
    setSelectedEnrollment(enrollment);
    setCertDialogOpen(true);
  }

  if (loading) {
    return <Skeleton className="h-32 w-full" />;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{t("courseEnrollments")}</h3>
        {!readOnly && (
          <Button size="sm" onClick={() => setEnrollDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t("enrollInCourse")}
          </Button>
        )}
      </div>

      {/* Summary Card */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="flex items-center justify-center gap-1 text-muted-foreground">
                <BookOpen className="h-4 w-4" />
                <span className="text-xs">{t("total")}</span>
              </div>
              <p className="text-2xl font-bold">{totalCourses}</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span className="text-xs">{t("active")}</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">{activeCourses}</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1 text-muted-foreground">
                <GraduationCap className="h-4 w-4" />
                <span className="text-xs">{t("completed")}</span>
              </div>
              <p className="text-2xl font-bold text-green-600">{completedCourses}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enrollments list */}
      {enrollments.length === 0 ? (
        <div className="flex h-24 items-center justify-center rounded-lg border border-dashed">
          <p className="text-sm text-muted-foreground">{t("noEnrollmentsYet")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {enrollments.map((enrollment) => (
            <Card key={enrollment.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{enrollment.courseName}</span>
                      <Badge variant="outline" className="text-xs">
                        {CATEGORY_LABEL_KEYS[enrollment.courseCategory]
                          ? t(CATEGORY_LABEL_KEYS[enrollment.courseCategory])
                          : enrollment.courseCategory}
                      </Badge>
                      <Badge variant={STATUS_BADGE_VARIANT[enrollment.status] || "secondary"}>
                        {STATUS_LABEL_KEYS[enrollment.status]
                          ? t(STATUS_LABEL_KEYS[enrollment.status])
                          : enrollment.status}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <span>
                        {t("startDate")}: {formatDate(enrollment.startDate)}
                        {enrollment.endDate ? ` — ${t("endDate")}: ${formatDate(enrollment.endDate)}` : ""}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <span>{t("totalFees")}: {formatCurrency(enrollment.fees)}</span>
                      <span>{t("amountPaid")}: {formatCurrency(enrollment.amountPaid)}</span>
                      <span>
                        {t("remaining")}: {formatCurrency(enrollment.remainingBalance)}
                      </span>
                    </div>
                    {enrollment.notes && (
                      <p className="text-xs text-muted-foreground italic">
                        {enrollment.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {!readOnly && enrollment.status === "active" && (role === "admin" || role === "coordinator") && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={completing === enrollment.id}
                        onClick={() => handleComplete(enrollment)}
                      >
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        {completing === enrollment.id ? "..." : t("complete")}
                      </Button>
                    )}
                    {enrollment.status === "completed" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCertificate(enrollment)}
                      >
                        <Award className="mr-1 h-3 w-3" />
                        {t("certificate")}
                      </Button>
                    )}
                    {!readOnly && (role === "admin" || role === "coordinator") && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        disabled={deleting === enrollment.id}
                        onClick={() => handleDelete(enrollment)}
                      >
                        <Trash2 className="mr-1 h-3 w-3" />
                        {deleting === enrollment.id ? "..." : t("remove")}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Enroll Dialog */}
      <EnrollDialog
        open={enrollDialogOpen}
        onOpenChange={setEnrollDialogOpen}
        studentId={studentId}
      />

      {/* Certificate Dialog */}
      {selectedEnrollment && (
        <CertificateDialog
          open={certDialogOpen}
          onOpenChange={setCertDialogOpen}
          studentName={studentName}
          studentCivilId={studentCivilId}
          enrollment={selectedEnrollment}
        />
      )}
    </div>
  );
}
