"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { PageHeader } from "@/components/layout/page-header";
import { StudentStatusBadge } from "@/components/students/student-status-badge";
import { EvaluationForm } from "@/components/evaluation/evaluation-form";
import { PaymentForm } from "@/components/payments/payment-form";
import { PaymentHistoryTable } from "@/components/payments/payment-history-table";
import { InstallmentPlanView } from "@/components/payments/installment-plan-view";
import { ActivityLogList } from "@/components/activity/activity-log-list";
import { AddNoteForm } from "@/components/activity/add-note-form";
import { AttendanceTracker } from "@/components/students/attendance-tracker";
import { DocumentUpload } from "@/components/students/document-upload";
import { EnrollmentTab } from "@/components/students/enrollment-tab";
import {
  getStudent,
  updateStudent,
  updateStudentStatus,
  archiveStudent,
  restoreStudent,
  deleteStudent,
  subscribeToActivityLog,
  addActivityLogEntry,
} from "@/lib/services/student-service";
import { addPayment, setTotalFees } from "@/lib/services/payment-service";
import { subscribeToPayments } from "@/lib/services/payment-service";
import { subscribeToEnrollments } from "@/lib/services/enrollment-service";
import { Student, Payment, ActivityLogEntry, StudentStatus, Enrollment } from "@/lib/types";
import { formatDate, formatCurrency, formatPhone } from "@/lib/utils/format";
import { STUDENT_STATUS_CONFIG, PIPELINE_STATUSES } from "@/lib/utils/constants";
import { EvaluationFormData, PaymentFormData, NoteFormData } from "@/lib/utils/validators";
import { Timestamp } from "firebase/firestore";
// Timestamp used in handleEvaluationSubmit for evaluatedAt
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Pencil,
  Archive,
  RotateCcw,
  Trash2,
  Plus,
  Phone,
  Mail,
  Calendar,
  UserCircle,
  MessageCircle,
  BookOpen,
} from "lucide-react";
import Link from "next/link";

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { firebaseUser, userData, role } = useAuth();
  const studentId = params.studentId as string;

  const [student, setStudent] = useState<Student | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [feesDialogOpen, setFeesDialogOpen] = useState(false);
  const [lostDialogOpen, setLostDialogOpen] = useState(false);
  const [lostReason, setLostReason] = useState("");
  const [totalFeesInput, setTotalFeesInput] = useState("");
  const [pendingStatus, setPendingStatus] = useState<StudentStatus | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    async function loadStudent() {
      const data = await getStudent(studentId);
      setStudent(data);
      setLoading(false);
    }
    loadStudent();
  }, [studentId]);

  // Subscribe to payments
  useEffect(() => {
    const unsub = subscribeToPayments(studentId, setPayments);
    return () => unsub();
  }, [studentId]);

  // Subscribe to activity log via REST API
  useEffect(() => {
    const unsub = subscribeToActivityLog(studentId, setActivities);
    return () => unsub();
  }, [studentId]);

  // Subscribe to enrollments
  useEffect(() => {
    const unsub = subscribeToEnrollments(studentId, setEnrollments);
    return () => unsub();
  }, [studentId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">Student not found</p>
      </div>
    );
  }

  // Sales reps can only access their own students
  if (role === "sales" && student.assignedSalesRepId !== firebaseUser?.uid) {
    router.replace("/students");
    return null;
  }

  async function handleStatusChange(newStatus: StudentStatus) {
    if (!firebaseUser || !userData || !student) return;

    if (newStatus === "lost") {
      setPendingStatus(newStatus);
      setLostDialogOpen(true);
      return;
    }

    try {
      await updateStudentStatus(studentId, newStatus, firebaseUser.uid, userData.displayName);
      setStudent({ ...student, status: newStatus });
      toast.success(`Status updated to ${STUDENT_STATUS_CONFIG[newStatus].label}`);
    } catch {
      toast.error("Failed to update status");
    }
  }

  async function handleLostConfirm() {
    if (!firebaseUser || !userData || !student || !pendingStatus) return;
    try {
      await updateStudentStatus(studentId, pendingStatus, firebaseUser.uid, userData.displayName, lostReason);
      setStudent({ ...student, status: pendingStatus, lostReason });
      toast.success("Student marked as lost");
      setLostDialogOpen(false);
      setLostReason("");
      setPendingStatus(null);
    } catch {
      toast.error("Failed to update status");
    }
  }

  async function handleEvaluationSubmit(data: EvaluationFormData) {
    if (!firebaseUser || !userData || !student) return;
    try {
      await updateStudent(
        studentId,
        {
          evaluation: {
            placementTestScore: data.placementTestScore,
            interviewStatus: data.interviewStatus,
            interviewNotes: data.interviewNotes || "",
            finalLevel: data.finalLevel,
            evaluatedAt: Timestamp.now(),
            evaluatedBy: firebaseUser.uid,
          },
        } as Partial<Student>,
        firebaseUser.uid,
        userData.displayName,
        { evaluation: { from: student.evaluation, to: data } }
      );

      // Add activity log via REST
      await addActivityLogEntry(studentId, {
        type: "evaluation",
        description: `Evaluation updated. Score: ${data.placementTestScore ?? "N/A"}, Level: ${data.finalLevel ?? "N/A"}, Interview: ${data.interviewStatus}`,
        createdBy: firebaseUser.uid,
        createdByName: userData.displayName,
        followUpDate: null,
      });

      // Auto-update status to evaluated if currently lead or contacted
      if (student.status === "lead" || student.status === "contacted") {
        await updateStudentStatus(studentId, "evaluated", firebaseUser.uid, userData.displayName);
        setStudent((prev) => prev ? { ...prev, status: "evaluated" } : null);
      }

      const updated = await getStudent(studentId);
      if (updated) setStudent(updated);
      toast.success("Evaluation saved");
    } catch {
      toast.error("Failed to save evaluation");
    }
  }

  async function handlePaymentSubmit(data: PaymentFormData) {
    if (!firebaseUser || !userData) return;
    try {
      await addPayment(
        studentId,
        {
          amount: data.amount,
          method: data.method,
          paymentDate: data.paymentDate,
          notes: data.notes,
          courseId: data.courseId,
          courseName: data.courseName,
        },
        firebaseUser.uid,
        userData.displayName
      );
      const updated = await getStudent(studentId);
      if (updated) setStudent(updated);
      toast.success("Payment recorded");
    } catch {
      toast.error("Failed to record payment");
    }
  }

  async function handleSetTotalFees() {
    if (!firebaseUser || !userData) return;
    const fees = parseFloat(totalFeesInput);
    if (isNaN(fees) || fees <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    try {
      await setTotalFees(studentId, fees, firebaseUser.uid, userData.displayName);
      const updated = await getStudent(studentId);
      if (updated) setStudent(updated);
      setFeesDialogOpen(false);
      setTotalFeesInput("");
      toast.success("Total fees updated");
    } catch {
      toast.error("Failed to update fees");
    }
  }

  async function handleAddNote(data: NoteFormData) {
    if (!firebaseUser || !userData) return;
    try {
      await addActivityLogEntry(studentId, {
        type: data.type,
        description: data.description,
        createdBy: firebaseUser.uid,
        createdByName: userData.displayName,
        followUpDate: data.followUpDate ?? null,
      });
      toast.success(data.type === "follow_up" ? "Follow-up scheduled" : "Note added");
    } catch {
      toast.error("Failed to add note");
    }
  }

  async function handleArchive() {
    if (!firebaseUser || !userData) return;
    try {
      await archiveStudent(studentId, firebaseUser.uid, userData.displayName);
      toast.success("Student archived");
      router.push("/students");
    } catch {
      toast.error("Failed to archive student");
    }
  }

  async function handleRestore() {
    if (!firebaseUser || !userData) return;
    try {
      await restoreStudent(studentId, firebaseUser.uid, userData.displayName);
      setStudent((prev) => prev ? { ...prev, isArchived: false } : null);
      toast.success("Student restored");
    } catch {
      toast.error("Failed to restore student");
    }
  }

  async function handleDelete() {
    if (!firebaseUser || !userData) return;
    try {
      await deleteStudent(studentId, firebaseUser.uid, userData.displayName);
      toast.success("Student deleted permanently");
      router.push("/students");
    } catch {
      toast.error("Failed to delete student");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={student.fullName}
        description={student.isArchived ? "Archived" : undefined}
        action={
          <div className="flex gap-2">
            <Link href={`/students/${studentId}/edit`}>
              <Button variant="outline" size="sm">
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </Link>
            {student.isArchived ? (
              <Button variant="outline" size="sm" onClick={handleRestore}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Restore
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={handleArchive}>
                <Archive className="mr-2 h-4 w-4" />
                Archive
              </Button>
            )}
            {role === "admin" && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            )}
          </div>
        }
      />

      {/* Quick info bar */}
      <div className="flex flex-wrap items-center gap-4">
        <StudentStatusBadge status={student.status} />
        <Select
          value={student.status}
          onValueChange={(val) => handleStatusChange(val as StudentStatus)}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PIPELINE_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {STUDENT_STATUS_CONFIG[s].label}
              </SelectItem>
            ))}
            <SelectItem value="lost">Lost</SelectItem>
          </SelectContent>
        </Select>
        {student.lostReason && (
          <Badge variant="destructive">Lost: {student.lostReason}</Badge>
        )}
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="enrollments">Enrollments</TabsTrigger>
          <TabsTrigger value="evaluation">Evaluation</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{formatPhone(student.phone)}</span>
                    <a
                      href={`https://wa.me/965${student.phone.replace(/\D/g, "").replace(/^965/, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open in WhatsApp"
                      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                    >
                      <MessageCircle className="h-3 w-3" />
                      WhatsApp
                    </a>
                  </div>
                  {student.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{student.email}</span>
                    </div>
                  )}
                  {student.civilId && (
                    <div className="flex items-center gap-2">
                      <UserCircle className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Civil ID: {student.civilId}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      Registered: {formatDate(student.registrationDate)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <UserCircle className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      Sales Rep: {student.assignedSalesRepName}
                    </span>
                  </div>
                  {student.interestedCourse && (
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        Interested In: {student.interestedCourse}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Lead Source
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant="secondary">{student.leadSource}</Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-sm text-muted-foreground">
                  Payment Summary
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFeesDialogOpen(true)}
                  >
                    Set Fees
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Fees:</span>
                    <span className="font-medium">
                      {formatCurrency(student.paymentSummary.totalFees)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Paid:</span>
                    <span className="font-medium text-green-600">
                      {formatCurrency(student.paymentSummary.amountPaid)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Remaining:</span>
                    <span className="font-medium text-langford-red">
                      {formatCurrency(student.paymentSummary.remainingBalance)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Evaluation Summary */}
          {student.evaluation.evaluatedAt && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Evaluation Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Test Score</p>
                    <p className="text-lg font-semibold">
                      {student.evaluation.placementTestScore ?? "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Level</p>
                    <p className="text-lg font-semibold">
                      {student.evaluation.finalLevel ?? "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Interview</p>
                    <Badge
                      variant={
                        student.evaluation.interviewStatus === "completed"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {student.evaluation.interviewStatus === "completed"
                        ? "Completed"
                        : "Not Completed"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Date</p>
                    <p className="text-sm">
                      {formatDate(student.evaluation.evaluatedAt)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Enrollments Tab */}
        <TabsContent value="enrollments">
          <EnrollmentTab studentId={studentId} studentName={student.fullName} studentCivilId={student.civilId} />
        </TabsContent>

        {/* Evaluation Tab */}
        <TabsContent value="evaluation">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Student Evaluation</CardTitle>
            </CardHeader>
            <CardContent>
              <EvaluationForm
                defaultValues={student.evaluation}
                onSubmit={handleEvaluationSubmit}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setPaymentDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Record Payment
            </Button>
          </div>
          <PaymentHistoryTable
            payments={payments}
            studentName={student.fullName}
            studentPhone={student.phone}
            studentCivilId={student.civilId}
          />
          {firebaseUser && (
            <InstallmentPlanView
              studentId={studentId}
              userId={firebaseUser.uid}
            />
          )}
          <PaymentForm
            open={paymentDialogOpen}
            onOpenChange={setPaymentDialogOpen}
            onSubmit={handlePaymentSubmit}
            remainingBalance={student.paymentSummary.remainingBalance}
            enrollments={enrollments}
          />
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Add Note / Follow-up</CardTitle>
            </CardHeader>
            <CardContent>
              <AddNoteForm onSubmit={handleAddNote} />
            </CardContent>
          </Card>
          <ActivityLogList activities={activities} />
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance">
          <AttendanceTracker studentId={studentId} />
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <DocumentUpload studentId={studentId} />
        </TabsContent>
      </Tabs>

      {/* Set Total Fees Dialog */}
      <Dialog open={feesDialogOpen} onOpenChange={setFeesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Total Fees</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Total Fees (KWD)</Label>
            <Input
              type="number"
              step="0.001"
              value={totalFeesInput}
              onChange={(e) => setTotalFeesInput(e.target.value)}
              placeholder="0.000"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFeesDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSetTotalFees}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lost Reason Dialog */}
      <Dialog open={lostDialogOpen} onOpenChange={setLostDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Why was this student lost?</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Reason</Label>
            <Textarea
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
              placeholder="e.g., Price too high, Chose competitor, Schedule conflict..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLostDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleLostConfirm}>
              Mark as Lost
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Student Permanently?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete <strong>{student?.fullName}</strong> and all their
            payments, activity logs, and evaluation data. This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
