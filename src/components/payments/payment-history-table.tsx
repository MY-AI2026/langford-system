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
import { Printer } from "lucide-react";
import { PaymentReceiptDialog } from "./payment-receipt-dialog";

interface PaymentHistoryTableProps {
  payments: Payment[];
  studentName?: string;
  studentPhone?: string;
  studentCivilId?: string;
}

export function PaymentHistoryTable({
  payments,
  studentName = "",
  studentPhone = "",
  studentCivilId,
}: PaymentHistoryTableProps) {
  const [receiptPayment, setReceiptPayment] = useState<Payment | null>(null);

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
    </>
  );
}
