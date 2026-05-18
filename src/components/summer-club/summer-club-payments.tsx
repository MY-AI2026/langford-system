"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import {
  SummerClubPayment,
  SummerClubStudent,
  PaymentMethod,
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
import { printReceipt } from "@/lib/utils/receipt";
import { toast } from "sonner";

interface Props {
  student: SummerClubStudent;
  canEdit: boolean;
  onChanged?: () => void;
}

export function SummerClubPayments({ student, canEdit, onChanged }: Props) {
  const { firebaseUser, userData } = useAuth();
  const [payments, setPayments] = useState<SummerClubPayment[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const unsub = subscribeToSummerClubPayments(student.id, setPayments);
    return () => unsub();
  }, [student.id]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!firebaseUser || !userData) return;
    if (amount <= 0) {
      toast.error("المبلغ يجب أن يكون أكبر من صفر");
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
      toast.success("تم إضافة الدفعة");
      setAmount(0);
      setNotes("");
      setShowForm(false);
      onChanged?.();
    } catch (err) {
      toast.error("فشل في إضافة الدفعة");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(p: SummerClubPayment) {
    if (!firebaseUser || !userData) return;
    if (!confirm(`حذف دفعة بمبلغ ${formatCurrency(p.amount)}؟`)) return;
    try {
      await deleteSummerClubPayment(
        student.id,
        p,
        firebaseUser.uid,
        userData.displayName
      );
      toast.success("تم الحذف");
      onChanged?.();
    } catch (err) {
      toast.error("فشل الحذف");
      console.error(err);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>المدفوعات</CardTitle>
        {canEdit && (
          <Button size="sm" onClick={() => setShowForm((v) => !v)}>
            <Plus className="mr-2 h-4 w-4" />
            إضافة دفعة
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
              <Label>المبلغ *</Label>
              <Input
                type="number"
                min={0}
                step="0.001"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label>طريقة الدفع</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">نقدي</SelectItem>
                  <SelectItem value="card">بطاقة</SelectItem>
                  <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                  <SelectItem value="online">أونلاين</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>تاريخ الدفع</Label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <Label>ملاحظات</Label>
              <Textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <div className="md:col-span-2 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={submitting}>
                حفظ
              </Button>
            </div>
          </form>
        )}

        {payments.length === 0 ? (
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed">
            <p className="text-sm text-muted-foreground">لا توجد مدفوعات</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>التاريخ</TableHead>
                <TableHead>المبلغ</TableHead>
                <TableHead>الطريقة</TableHead>
                <TableHead>الإيصال</TableHead>
                <TableHead>ملاحظات</TableHead>
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
                          title="طباعة الإيصال"
                          onClick={() =>
                            printReceipt({
                              payment: {
                                receiptNumber: p.receiptNumber,
                                amount: p.amount,
                                paymentDate: p.paymentDate as unknown as Date,
                                method: p.method,
                                notes: p.notes,
                                courseName: "النادي الصيفي",
                              },
                              student: {
                                fullName: student.fullName,
                                phone: student.phone,
                              },
                              cashierName: userData?.displayName,
                            })
                          }
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
      </CardContent>
    </Card>
  );
}
