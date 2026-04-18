"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { RoleGate } from "@/components/auth/role-gate";
import { PageHeader } from "@/components/layout/page-header";
import { subscribeToStudents } from "@/lib/services/student-service";
import {
  subscribeToEmbassyPayments,
  createEmbassyPayment,
  deleteEmbassyPayment,
} from "@/lib/services/embassy-payment-service";
import { Student, EmbassyPayment } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { FileCheck, TrendingDown, Calculator, Plus, Trash2 } from "lucide-react";

export default function EmbassyPaymentsPage() {
  return (
    <RoleGate allowedRoles={["admin", "accountant"]}>
      <EmbassyPaymentsContent />
    </RoleGate>
  );
}

function EmbassyPaymentsContent() {
  const { role, firebaseUser, userData } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<EmbassyPayment[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!firebaseUser || !role) return;
    const unsubStudents = subscribeToStudents(
      { role, userId: firebaseUser.uid },
      setStudents
    );
    const unsubPayments = subscribeToEmbassyPayments(setPayments);
    return () => {
      unsubStudents();
      unsubPayments();
    };
  }, [firebaseUser, role]);

  // Only students with at least 1 IELTS payment
  const ieltsStudents = useMemo(
    () =>
      students
        .filter((s) => (s.ieltsSummary?.paymentsCount ?? 0) > 0)
        .sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [students]
  );

  const totalIelts = students.reduce(
    (sum, s) => sum + (s.ieltsSummary?.totalPaid ?? 0),
    0
  );
  const totalEmbassy = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const netIelts = totalIelts - totalEmbassy;

  const resetForm = () => {
    setSelectedStudentId("");
    setAmount("");
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setNotes("");
  };

  const handleSubmit = async () => {
    if (!firebaseUser || !userData) return;
    if (!selectedStudentId) {
      toast.error("Please select a student");
      return;
    }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    const student = students.find((s) => s.id === selectedStudentId);
    if (!student) {
      toast.error("Student not found");
      return;
    }

    setSubmitting(true);
    try {
      await createEmbassyPayment(
        {
          studentId: student.id,
          studentName: student.fullName,
          amount: amt,
          paymentDate: new Date(paymentDate),
          notes: notes.trim() || undefined,
        },
        firebaseUser.uid,
        userData.displayName || firebaseUser.email || "Unknown"
      );
      toast.success("Embassy payment recorded");
      resetForm();
      setDialogOpen(false);
    } catch (e) {
      console.error(e);
      toast.error("Failed to record payment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (p: EmbassyPayment) => {
    if (!firebaseUser || !userData) return;
    if (!confirm(`Delete embassy payment of ${formatCurrency(p.amount)} for ${p.studentName}?`)) {
      return;
    }
    try {
      await deleteEmbassyPayment(
        p.id,
        firebaseUser.uid,
        userData.displayName || firebaseUser.email || "Unknown",
        p.studentName,
        p.amount
      );
      toast.success("Payment deleted");
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete payment");
    }
  };

  const canEdit = role === "admin";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Embassy Transfers (IELTS)"
        description="Track amounts transferred to the embassy for IELTS exam bookings"
      />

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Total IELTS Bookings
            </CardTitle>
            <div className="rounded-lg p-2 bg-purple-50">
              <FileCheck className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalIelts)}</p>
            <p className="text-xs text-muted-foreground mt-1">Gross collected</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Paid to Embassy
            </CardTitle>
            <div className="rounded-lg p-2 bg-orange-50">
              <TrendingDown className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600">
              {formatCurrency(totalEmbassy)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {payments.length} transfer{payments.length !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Net IELTS Revenue
            </CardTitle>
            <div className="rounded-lg p-2 bg-emerald-50">
              <Calculator className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${netIelts >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {formatCurrency(netIelts)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Total − Embassy
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Add button */}
      {canEdit && (
        <div className="flex justify-end">
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Record Embassy Transfer
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record Embassy Transfer</DialogTitle>
                <DialogDescription>
                  Log an amount paid to the embassy for a student&apos;s IELTS exam.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-2">
                <div className="grid gap-2">
                  <Label htmlFor="student">Student (IELTS bookings only)</Label>
                  <Select
                    value={selectedStudentId}
                    onValueChange={(v) => setSelectedStudentId(v ?? "")}
                  >
                    <SelectTrigger id="student">
                      <SelectValue placeholder="Select a student..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ieltsStudents.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          No students with IELTS bookings
                        </div>
                      ) : (
                        ieltsStudents.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.fullName} — {formatCurrency(s.ieltsSummary?.totalPaid ?? 0)}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="amount">Amount Paid to Embassy</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.001"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.000"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="date">Payment Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Receipt number, reference, etc."
                    rows={2}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={submitting}>
                  {submitting ? "Saving..." : "Save Transfer"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Payments table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Recorded By</TableHead>
              {canEdit && <TableHead className="w-16"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{formatDate(p.paymentDate)}</TableCell>
                <TableCell className="font-medium">{p.studentName}</TableCell>
                <TableCell className="text-orange-600 font-medium">
                  {formatCurrency(p.amount)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {p.notes || "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {p.createdByName}
                </TableCell>
                {canEdit && (
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(p)}
                      className="h-8 w-8 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {payments.length === 0 && (
              <TableRow>
                <TableCell colSpan={canEdit ? 6 : 5} className="text-center text-muted-foreground py-8">
                  No embassy transfers recorded yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
