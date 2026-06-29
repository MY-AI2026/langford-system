"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";
import { getSalesUsers } from "@/lib/services/user-service";
import { User, Gender } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

export interface SummerClubFormData {
  fullName: string;
  phone: string;
  gender: Gender;
  age: number | null;
  guardianName: string;
  guardianPhone: string;
  notes: string;
  isRegistered: boolean;
  totalFees: number;
  assignedSalesRepId: string;
}

interface Props {
  defaultValues?: Partial<SummerClubFormData>;
  onSubmit: (data: SummerClubFormData) => Promise<void>;
  submitLabel?: string;
  hideAssignedSales?: boolean;
}

export function SummerClubForm({
  defaultValues,
  onSubmit,
  submitLabel,
  hideAssignedSales = false,
}: Props) {
  const { role, firebaseUser } = useAuth();
  const { t } = useLanguage();
  const [salesUsers, setSalesUsers] = useState<User[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState<SummerClubFormData>({
    fullName: defaultValues?.fullName ?? "",
    phone: defaultValues?.phone ?? "",
    gender: defaultValues?.gender ?? "male",
    age: defaultValues?.age ?? null,
    guardianName: defaultValues?.guardianName ?? "",
    guardianPhone: defaultValues?.guardianPhone ?? "",
    notes: defaultValues?.notes ?? "",
    isRegistered: defaultValues?.isRegistered ?? false,
    totalFees: defaultValues?.totalFees ?? 0,
    assignedSalesRepId:
      defaultValues?.assignedSalesRepId ??
      (role === "sales" ? firebaseUser?.uid || "" : ""),
  });

  useEffect(() => {
    async function load() {
      const users = await getSalesUsers();
      setSalesUsers(users);
    }
    load();
  }, []);

  // Keep assignedSalesRepId in sync with the logged-in sales user.
  // Runs whenever firebaseUser becomes available (which can be AFTER the initial
  // render if useAuth resolves async) — without this, a sales rep clicking save
  // too fast would submit with empty assignedSalesRepId and hit a silent
  // "السيلز مطلوب" field error.
  useEffect(() => {
    if (role === "sales" && firebaseUser?.uid && !defaultValues?.assignedSalesRepId) {
      setForm((f) =>
        f.assignedSalesRepId === firebaseUser.uid
          ? f
          : { ...f, assignedSalesRepId: firebaseUser.uid }
      );
    }
  }, [role, firebaseUser, defaultValues?.assignedSalesRepId]);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.fullName.trim()) e.fullName = t("nameRequired");

    if (!form.phone.trim()) {
      e.phone = t("phoneRequired");
    } else {
      // Strip all non-digit chars (handles +965, spaces, dashes, parens, Arabic digits)
      const arabicToAscii: Record<string, string> = {
        "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
        "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
      };
      const digits = form.phone
        .split("")
        .map((c) => arabicToAscii[c] ?? c)
        .join("")
        .replace(/\D/g, "");
      if (digits.length < 6) e.phone = t("phoneTooShort");
    }

    if (!form.assignedSalesRepId) {
      e.assignedSalesRepId =
        role === "sales"
          ? t("yourDataNotReady")
          : t("salesRepRequired");
    }
    if (form.totalFees < 0) e.totalFees = t("invalid");
    if (form.age !== null && form.age !== undefined && (form.age < 0 || form.age > 120))
      e.age = t("invalid");
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSubmit(form);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="fullName">{t("fullName")} *</Label>
          <Input
            id="fullName"
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
          />
          {errors.fullName && <p className="text-xs text-red-500">{errors.fullName}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">{t("phone")} *</Label>
          <Input
            id="phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
        </div>

        <div className="space-y-2">
          <Label>{t("gender")} *</Label>
          <Select
            value={form.gender}
            onValueChange={(v) => setForm({ ...form, gender: v as Gender })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">{t("male")}</SelectItem>
              <SelectItem value="female">{t("female")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="age">{t("age")}</Label>
          <Input
            id="age"
            type="number"
            min={0}
            value={form.age ?? ""}
            onChange={(e) =>
              setForm({
                ...form,
                age: e.target.value === "" ? null : Number(e.target.value),
              })
            }
          />
          {errors.age && <p className="text-xs text-red-500">{errors.age}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="guardianName">{t("guardianName")}</Label>
          <Input
            id="guardianName"
            value={form.guardianName}
            onChange={(e) => setForm({ ...form, guardianName: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="guardianPhone">{t("guardianPhone")}</Label>
          <Input
            id="guardianPhone"
            value={form.guardianPhone}
            onChange={(e) => setForm({ ...form, guardianPhone: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="totalFees">{t("totalFees")} (KWD)</Label>
          <Input
            id="totalFees"
            type="number"
            min={0}
            step="0.001"
            value={form.totalFees}
            onChange={(e) =>
              setForm({ ...form, totalFees: Number(e.target.value) || 0 })
            }
          />
          {errors.totalFees && <p className="text-xs text-red-500">{errors.totalFees}</p>}
        </div>

        {!hideAssignedSales && role !== "sales" && (
          <div className="space-y-2">
            <Label>{t("assignedSalesRep")} *</Label>
            <Select
              value={form.assignedSalesRepId}
              onValueChange={(v) =>
                setForm({ ...form, assignedSalesRepId: v ?? "" })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t("selectSalesRep")} />
              </SelectTrigger>
              <SelectContent>
                {salesUsers.map((u) => (
                  <SelectItem key={u.uid} value={u.uid}>
                    {u.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.assignedSalesRepId && (
              <p className="text-xs text-red-500">{errors.assignedSalesRepId}</p>
            )}
          </div>
        )}

        <div className="space-y-2 md:col-span-2 flex items-center gap-3 pt-2">
          <Switch
            id="isRegistered"
            checked={form.isRegistered}
            onCheckedChange={(v) => setForm({ ...form, isRegistered: v })}
          />
          <Label htmlFor="isRegistered">{t("registeredInSummerClub")}</Label>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="notes">{t("notes")}</Label>
          <Textarea
            id="notes"
            rows={3}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitLabel ?? t("save")}
        </Button>
      </div>
    </form>
  );
}
