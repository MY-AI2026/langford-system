"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";
import {
  SummerClubPayment,
  SummerClubStudent,
  PaymentMethod,
  Payment,
} from "@/lib/types";
import {
  subscribeToSummerClubPayments,
  addSummerClubPayment,
  deleteSummerClubPayment,
} from "@/lib/services/summer-club-service";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Printer } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils/format";
import { PaymentReceiptDialog } from "@/components/payments/payment-receipt-dialog";
import { toast } from "sonner";

interface Props {
  student: SummerClubStudent;
  canEdit: boolean;
  onChanged?: () => void;
}

export function SummerClubPayments({ student, canEdit, onChanged }: Props) {
  const { firebaseUser, userData } = useAuth();
  const { t } = useLanguage();
  const [payments, setPayments] = useState<SummerClubPayment[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState("");

  // Receipt — reuses the same branded dialog as the main payments module.
  const [receiptPayment, setReceiptPayment] = useState<Payment | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  function openReceipt(p: SummerClubPayment) {
    // Map a SummerClubPayment onto the shared Payment shape so the receipt
    // looks identical to the main system (course shown as "النادي الصيفي").
    setReceiptPayment({
      id: p.id,
      amount: p.amount,
      paymentDate: p.paymentDate,
      method: p.method,
      receiptNumber: p.receiptNumber,
      notes: p.notes,
      isInstallment: false,
      installmentNumber: null,
      courseName: t("summerClub"),
      category: "main",
      createdBy: p.createdBy,
      createdAt: p.createdAt,
    });
    setReceiptOpen(true);
  }

  useEffect(() => {
    const unsub = subscribeToSummerClubPayments(student.id, setPayments);
    return () => unsub();
  }, [student.id]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!firebaseUser || !userData) return;
    if (amount <= 0) {
      toast.error(t("amountMustBePositive"));
      return;
    }
    setSubmitting(true);
    try {
      await addSummerClubPayment(
        student.id,
        {
          amount,
          method,
          paymentDate: new Date(paymentDate),
          notes,
        },
        firebaseUser.uid,
        userData.displayName
      );
      toast.success(t("paymentAdded"));
      setAmount(0);
      setNotes("");
      setShowForm(false);
      onChanged?.();
    } catch (err) {
      toast.error(t("paymentAddFailed"));
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(p: SummerClubPayment) {
    if (!firebaseUser || !userData) return;
    if (!confirm(`${t("deletePaymentConfirm")} ${formatCurrency(p.amount)}؟`)) return;
    try {
      await deleteSummerClubPayment(
        student.id,
        p,
        firebaseUser.uid,
        userData.displayName
      );
      toast.success(t("deleted"));
      onChanged?.();
    } catch (err) {
      toast.error(t("deleteFailed"));
      console.error(err);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t("payments")}</CardTitle>
        {canEdit && (
          <Button size="sm" onClick={() => setShowForm((v) => !v)}>
            <Plus className="mr-2 h-4 w-4" />
            {t("addPayment")}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && canEdit && (
          <form
            onSubmit={handleAdd}
            className="rounded-lg border bg-muted/30 p-4 grid gap-3 md:grid-cols-2"
          >
            <div>
              <Label>{t("amount")} *</Label>
              <Input
                type="number"
                min={0}
                step="0.001"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label>{t("paymentMethod")}</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">{t("cash")}</SelectItem>
                  <SelectItem value="card">{t("card")}</SelectItem>
                  <SelectItem value="bank_transfer">{t("bankTransfer")}</SelectItem>
                  <SelectItem value="online">{t("online")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("paymentDate")}</Label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <Label>{t("notes")}</Label>
              <Textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <div className="md:col-span-2 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={submitting}>
                {t("save")}
              </Button>
            </div>
          </form>
        )}

        {payments.length === 0 ? (
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed">
            <p className="text-sm text-muted-foreground">{t("noPayments")}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("date")}</TableHead>
                <TableHead>{t("amount")}</TableHead>
                <TableHead>{t("method")}</TableHead>
                <TableHead>{t("receipt")}</TableHead>
                <TableHead>{t("notes")}</TableHead>
                {canEdit && <TableHead className="w-12" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{formatDate(p.paymentDate)}</TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(p.amount)}
                  </TableCell>
                  <TableCell>{p.method}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.receiptNumber}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.notes || "—"}
                  </TableCell>
                  {canEdit && (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title={t("receipt")}
                          onClick={() => openReceipt(p)}
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(p)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <PaymentReceiptDialog
          open={receiptOpen}
          onOpenChange={setReceiptOpen}
          payment={receiptPayment}
          studentName={student.fullName}
          studentPhone={student.phone}
        />
      </CardContent>
    </Card>
  );
}
