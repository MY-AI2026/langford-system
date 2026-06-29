"use client";

import { useState } from "react";
import { useLanguage } from "@/contexts/language-context";
import { Payment } from "@/lib/types";
import { formatDate, formatCurrency } from "@/lib/utils/format";
import { PAYMENT_METHOD_LABELS } from "@/lib/utils/constants";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Printer, Trash2 } from "lucide-react";
import { PaymentReceiptDialog } from "./payment-receipt-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PaymentHistoryTableProps {
  payments: Payment[];
  studentName?: string;
  studentPhone?: string;
  studentCivilId?: string;
  isAdmin?: boolean;
  onDeletePayment?: (payment: Payment) => Promise<void>;
}

export function PaymentHistoryTable({
  payments,
  studentName = "",
  studentPhone = "",
  studentCivilId,
  isAdmin = false,
  onDeletePayment,
}: PaymentHistoryTableProps) {
  const { t } = useLanguage();
  const [receiptPayment, setReceiptPayment] = useState<Payment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Payment | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!deleteTarget || !onDeletePayment) return;
    setDeleting(true);
    try {
      await onDeletePayment(deleteTarget);
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  if (payments.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-dashed">
        <p className="text-sm text-muted-foreground">{t("noPayments")}</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("date")}</TableHead>
              <TableHead>{t("amount")}</TableHead>
              <TableHead>{t("method")}</TableHead>
              <TableHead>{t("receiptNumber")}</TableHead>
              <TableHead>{t("notes")}</TableHead>
              <TableHead className="w-12" />
              {isAdmin && <TableHead className="w-12" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {formatDate(payment.paymentDate)}
                    {payment.category === "ielts" && (
                      <Badge className="border-0 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200">
                        IELTS
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-medium">
                  {formatCurrency(payment.amount)}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {PAYMENT_METHOD_LABELS[payment.method]}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {payment.receiptNumber}
                </TableCell>
                <TableCell className="text-muted-foreground max-w-48 truncate">
                  {payment.notes || "-"}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    title={t("printReceipt")}
                    onClick={() => setReceiptPayment(payment)}
                  >
                    <Printer className="h-4 w-4" />
                  </Button>
                </TableCell>
                {isAdmin && (
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      title={t("deletePayment")}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteTarget(payment)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <PaymentReceiptDialog
        open={!!receiptPayment}
        onOpenChange={(open) => { if (!open) setReceiptPayment(null); }}
        payment={receiptPayment}
        studentName={studentName}
        studentPhone={studentPhone}
        studentCivilId={studentCivilId}
      />

      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open && !deleting) setDeleteTarget(null); }}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{t("deletePayment")}</DialogTitle>
            <DialogDescription>
              {t("deletePaymentConfirm")}
            </DialogDescription>
          </DialogHeader>
          {deleteTarget && (
            <div className="rounded-md bg-muted p-3 text-sm space-y-1">
              <p><span className="font-medium">{t("amount")}:</span> {formatCurrency(deleteTarget.amount)}</p>
              <p><span className="font-medium">{t("receipt")}:</span> {deleteTarget.receiptNumber}</p>
              <p><span className="font-medium">{t("method")}:</span> {PAYMENT_METHOD_LABELS[deleteTarget.method]}</p>
              <p><span className="font-medium">{t("date")}:</span> {formatDate(deleteTarget.paymentDate)}</p>
            </div>
          )}
          <p className="text-sm text-destructive">
            {t("deletePaymentWarning")}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              {t("cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? t("deleting") : t("deletePayment")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
