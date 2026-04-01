"use client";

import { useEffect, useState } from "react";
import { subscribeToEnrollments, completeEnrollment } from "@/lib/services/enrollment-service";
import { useAuth } from "@/contexts/auth-context";
import { Enrollment } from "@/lib/types";
import { formatDate, formatCurrency } from "@/lib/utils/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, CheckCircle2, Award, BookOpen, Clock, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { EnrollDialog } from "./enroll-dialog";
import { CertificateDialog } from "./certificate-dialog";

interface EnrollmentTabProps {
  studentId: string;
  studentName: string;
  studentCivilId?: string;
}

const STATUS_BADGE_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  completed: "secondary",
  dropped: "destructive",
  on_hold: "outline",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  completed: "Completed",
  dropped: "Dropped",
  on_hold: "On Hold",
};

const CATEGORY_LABELS: Record<string, string> = {
  general_english: "General English",
  exam_prep: "Exam Prep",
  professional: "Professional",
  diploma: "Diploma",
  esp: "ESP",
  conversation: "Conversation",
  school: "School",
  other: "Other",
};

export function EnrollmentTab({ studentId, studentName, studentCivilId }: EnrollmentTabProps) {
  const { role, firebaseUser, userData } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [certDialogOpen, setCertDialogOpen] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState<Enrollment | null>(null);
  const [completing, setCompleting] = useState<string | null>(null);

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
      toast.success("Enrollment marked as completed");
    } catch {
      toast.error("Failed to complete enrollment");
    } finally {
      setCompleting(null);
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
        <h3 className="text-lg font-semibold">Course Enrollments</h3>
        <Button size="sm" onClick={() => setEnrollDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Enroll in Course
        </Button>
      </div>

      {/* Summary Card */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="flex items-center justify-center gap-1 text-muted-foreground">
                <BookOpen className="h-4 w-4" />
                <span className="text-xs">Total</span>
              </div>
              <p className="text-2xl font-bold">{totalCourses}</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span className="text-xs">Active</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">{activeCourses}</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1 text-muted-foreground">
                <GraduationCap className="h-4 w-4" />
                <span className="text-xs">Completed</span>
              </div>
              <p className="text-2xl font-bold text-green-600">{completedCourses}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enrollments list */}
      {enrollments.length === 0 ? (
        <div className="flex h-24 items-center justify-center rounded-lg border border-dashed">
          <p className="text-sm text-muted-foreground">No course enrollments yet</p>
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
                        {CATEGORY_LABELS[enrollment.courseCategory] || enrollment.courseCategory}
                      </Badge>
                      <Badge variant={STATUS_BADGE_VARIANT[enrollment.status] || "secondary"}>
                        {STATUS_LABELS[enrollment.status] || enrollment.status}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <span>
                        Start: {formatDate(enrollment.startDate)}
                        {enrollment.endDate ? ` — End: ${formatDate(enrollment.endDate)}` : ""}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <span>Fees: {formatCurrency(enrollment.fees)}</span>
                      <span>Paid: {formatCurrency(enrollment.amountPaid)}</span>
                      <span>
                        Remaining: {formatCurrency(enrollment.remainingBalance)}
                      </span>
                    </div>
                    {enrollment.notes && (
                      <p className="text-xs text-muted-foreground italic">
                        {enrollment.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {enrollment.status === "active" && role === "admin" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={completing === enrollment.id}
                        onClick={() => handleComplete(enrollment)}
                      >
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        {completing === enrollment.id ? "..." : "Complete"}
                      </Button>
                    )}
                    {enrollment.status === "completed" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCertificate(enrollment)}
                      >
                        <Award className="mr-1 h-3 w-3" />
                        Certificate
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
