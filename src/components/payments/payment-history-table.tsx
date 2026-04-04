"use client";

import { useState } from "react";
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
        <p className="text-sm text-muted-foreground">No payments recorded</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Receipt #</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="w-12" />
              {isAdmin && <TableHead className="w-12" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell>{formatDate(payment.paymentDate)}</TableCell>
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
                    title="Print Receipt"
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
                      title="Delete Payment"
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
            <DialogTitle>Delete Payment</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this payment?
            </DialogDescription>
          </DialogHeader>
          {deleteTarget && (
            <div className="rounded-md bg-muted p-3 text-sm space-y-1">
              <p><span className="font-medium">Amount:</span> {formatCurrency(deleteTarget.amount)}</p>
              <p><span className="font-medium">Receipt:</span> {deleteTarget.receiptNumber}</p>
              <p><span className="font-medium">Method:</span> {PAYMENT_METHOD_LABELS[deleteTarget.method]}</p>
              <p><span className="font-medium">Date:</span> {formatDate(deleteTarget.paymentDate)}</p>
            </div>
          )}
          <p className="text-sm text-destructive">
            This will update the student&apos;s balance accordingly. This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
