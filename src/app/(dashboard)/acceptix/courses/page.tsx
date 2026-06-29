"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";
import { RoleGate } from "@/components/auth/role-gate";
import {
  subscribeToCourses,
  createCourse,
  updateCourse,
  toggleCourseActive,
} from "@/lib/services/reg-course-service";
import { regCourseSchema, RegCourseFormData } from "@/lib/utils/validators";
import { SEED_COURSES } from "@/lib/registration/seed-courses";
import { RegCourse, RegCourseCategory } from "@/lib/types";
import {
  REG_CATEGORY_LABELS,
  REG_CATEGORY_ORDER,
  REG_DEFAULT_CURRENCY,
} from "@/lib/registration/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  BookOpen,
  Plus,
  Pencil,
  Sparkles,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";

function AdminCoursesContent() {
  const { t } = useLanguage();
  const { firebaseUser, userData } = useAuth();
  const [courses, setCourses] = useState<RegCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RegCourse | null>(null);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeToCourses((data) => {
      setCourses(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<RegCourseCategory, RegCourse[]>();
    for (const c of courses) {
      const list = map.get(c.category) ?? [];
      list.push(c);
      map.set(c.category, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.name.localeCompare(b.name, "ar"));
    }
    return map;
  }, [courses]);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(course: RegCourse) {
    setEditing(course);
    setDialogOpen(true);
  }

  async function handleToggleActive(course: RegCourse) {
    if (!firebaseUser || !userData) return;
    try {
      await toggleCourseActive(course.id, !course.isActive, {
        uid: firebaseUser.uid,
        displayName: userData.displayName,
        role: "admin",
      });
      toast.success(course.isActive ? t("courseHidden") : t("courseActivated"));
    } catch (e) {
      console.error("[admin-courses] toggle failed:", e);
      toast.error(t("statusChangeFailed"));
    }
  }

  async function handleSeed() {
    if (!firebaseUser || !userData) return;
    if (courses.length > 0) {
      const ok = window.confirm(t("syncCatalogueConfirm"));
      if (!ok) return;
    }
    setSeeding(true);
    try {
      const existingByName = new Map(courses.map((c) => [c.name, c]));
      const actor = {
        uid: firebaseUser.uid,
        displayName: userData.displayName,
        role: "admin" as const,
      };
      let added = 0;
      let updated = 0;

      for (const seed of SEED_COURSES) {
        const existing = existingByName.get(seed.name);

        if (!existing) {
          await createCourse(
            {
              name: seed.name,
              category: seed.category,
              description: seed.description,
              fee: seed.fee ?? 0,
              currency: REG_DEFAULT_CURRENCY,
              durationHours: seed.durationHours,
              durationLabel: seed.durationLabel,
              isExclusiveAcceptix: seed.isExclusiveAcceptix,
              isActive: true,
            },
            actor
          );
          added++;
          continue;
        }

        // Existing — only update if there's a meaningful drift from the seed.
        const targetFee = seed.fee ?? 0;
        const drift =
          existing.fee !== targetFee ||
          existing.category !== seed.category ||
          existing.isExclusiveAcceptix !== seed.isExclusiveAcceptix ||
          (existing.durationLabel ?? "") !== seed.durationLabel;

        if (drift) {
          await updateCourse(
            existing.id,
            {
              category: seed.category,
              description: seed.description,
              fee: targetFee,
              currency: REG_DEFAULT_CURRENCY,
              durationHours: seed.durationHours,
              durationLabel: seed.durationLabel,
              isExclusiveAcceptix: seed.isExclusiveAcceptix,
            },
            actor,
            {
              fee: { from: existing.fee, to: targetFee },
            }
          );
          updated++;
        }
      }

      const parts: string[] = [];
      if (added > 0) parts.push(`${t("addedCount")} ${added}`);
      if (updated > 0) parts.push(`${t("updatedCount")} ${updated}`);
      toast.success(
        parts.length > 0
          ? `${t("catalogueSynced")} — ${parts.join("، ")}.`
          : t("catalogueUpToDate")
      );
    } catch (e) {
      console.error("[admin-courses] seed failed:", e);
      toast.error(t("seedFailed"));
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="space-y-6" dir="ltr">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <BookOpen className="h-6 w-6 text-primary" />
            {t("manageCourses")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("manageCoursesPageSubtitle")}
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSeed} disabled={seeding}>
            {seeding ? (
              <Loader2 className="ml-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="ml-2 h-4 w-4" />
            )}
            {t("loadDefaultCatalogue")}
          </Button>
          <Button onClick={openCreate}>
            <Plus className="ml-2 h-4 w-4" />
            {t("newCourse")}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <BookOpen className="mb-3 h-10 w-10 text-muted-foreground" />
            <h3 className="text-base font-semibold">{t("noCoursesYet")}</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {t("noCoursesYetDesc")}
            </p>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" onClick={handleSeed} disabled={seeding}>
                <Sparkles className="ml-2 h-4 w-4" />
                {t("loadDefaults")}
              </Button>
              <Button onClick={openCreate}>
                <Plus className="ml-2 h-4 w-4" />
                {t("newCourse")}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {REG_CATEGORY_ORDER.map((cat) => {
            const list = grouped.get(cat);
            if (!list || list.length === 0) return null;
            return (
              <Card key={cat}>
                <CardHeader>
                  <CardTitle className="text-base">
                    {REG_CATEGORY_LABELS[cat].en}{" "}
                    <span className="text-sm text-muted-foreground">
                      ({list.length})
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("name")}</TableHead>
                        <TableHead>{t("fee")}</TableHead>
                        <TableHead>{t("duration")}</TableHead>
                        <TableHead>{t("exclusive")}</TableHead>
                        <TableHead>{t("status")}</TableHead>
                        <TableHead className="w-32"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {list.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell dir="ltr">
                            {c.fee > 0
                              ? `${c.fee.toLocaleString("en-US")} ${c.currency}`
                              : "—"}
                          </TableCell>
                          <TableCell>{c.durationLabel || "—"}</TableCell>
                          <TableCell>
                            {c.isExclusiveAcceptix ? (
                              <Badge variant="secondary" className="border-0">
                                {t("acceptixExclusive")}
                              </Badge>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell>
                            {c.isActive ? (
                              <Badge className="border-0 bg-green-100 text-green-700">
                                {t("active")}
                              </Badge>
                            ) : (
                              <Badge className="border-0 bg-muted text-muted-foreground">
                                {t("hidden")}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEdit(c)}
                                aria-label={t("edit")}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleToggleActive(c)}
                                aria-label={c.isActive ? t("hide") : t("show")}
                              >
                                {c.isActive ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4 text-green-600" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CourseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
      />
    </div>
  );
}

function CourseDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: RegCourse | null;
}) {
  const { t } = useLanguage();
  const { firebaseUser, userData } = useAuth();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RegCourseFormData>({
    resolver: zodResolver(regCourseSchema),
    defaultValues: {
      name: "",
      category: "professional",
      description: "",
      fee: 0,
      currency: REG_DEFAULT_CURRENCY,
      durationHours: undefined,
      durationLabel: "",
      isExclusiveAcceptix: false,
      isActive: true,
    },
  });

  useEffect(() => {
    if (editing) {
      reset({
        name: editing.name,
        category: editing.category,
        description: editing.description ?? "",
        fee: editing.fee ?? 0,
        currency: editing.currency ?? REG_DEFAULT_CURRENCY,
        durationHours: editing.durationHours ?? undefined,
        durationLabel: editing.durationLabel ?? "",
        isExclusiveAcceptix: editing.isExclusiveAcceptix,
        isActive: editing.isActive,
      });
    } else {
      reset({
        name: "",
        category: "professional",
        description: "",
        fee: 0,
        currency: REG_DEFAULT_CURRENCY,
        durationHours: undefined,
        durationLabel: "",
        isExclusiveAcceptix: false,
        isActive: true,
      });
    }
  }, [editing, reset]);

  async function onSubmit(data: RegCourseFormData) {
    if (!firebaseUser || !userData) return;
    try {
      if (editing) {
        await updateCourse(
          editing.id,
          {
            name: data.name,
            category: data.category,
            description: data.description ?? "",
            fee: data.fee ?? 0,
            currency: data.currency ?? REG_DEFAULT_CURRENCY,
            durationHours: data.durationHours ?? null,
            durationLabel: data.durationLabel ?? "",
            isExclusiveAcceptix: data.isExclusiveAcceptix ?? false,
            isActive: data.isActive ?? true,
          },
          { uid: firebaseUser.uid, displayName: userData.displayName, role: "admin" }
        );
        toast.success(t("courseUpdated"));
      } else {
        await createCourse(
          {
            name: data.name,
            category: data.category,
            description: data.description ?? "",
            fee: data.fee ?? 0,
            currency: data.currency ?? REG_DEFAULT_CURRENCY,
            durationHours: data.durationHours ?? null,
            durationLabel: data.durationLabel ?? "",
            isExclusiveAcceptix: data.isExclusiveAcceptix ?? false,
            isActive: data.isActive ?? true,
          },
          { uid: firebaseUser.uid, displayName: userData.displayName, role: "admin" }
        );
        toast.success(t("courseCreated"));
      }
      onOpenChange(false);
    } catch (e) {
      console.error("[course-dialog] save failed:", e);
      toast.error(t("saveFailed"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="ltr" className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? t("editCourse") : t("newCourse")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="c-name">
              {t("name")} <span className="text-destructive">*</span>
            </Label>
            <Input id="c-name" {...register("name")} aria-invalid={!!errors.name} />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("category")}</Label>
              <Select
                value={watch("category")}
                onValueChange={(v) => setValue("category", v as RegCourseCategory)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REG_CATEGORY_ORDER.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {REG_CATEGORY_LABELS[cat].en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="c-currency">{t("currency")}</Label>
              <Input id="c-currency" {...register("currency")} dir="ltr" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="c-fee">{t("fee")}</Label>
              <Input
                id="c-fee"
                type="number"
                step="0.001"
                min="0"
                dir="ltr"
                {...register("fee", { valueAsNumber: true })}
                aria-invalid={!!errors.fee}
              />
              {errors.fee && (
                <p className="text-sm text-destructive">{errors.fee.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="c-dur">{t("durationLabel")}</Label>
              <Input
                id="c-dur"
                placeholder={t("durationPlaceholderExample")}
                {...register("durationLabel")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="c-desc">{t("description")}</Label>
            <Textarea id="c-desc" rows={3} {...register("description")} />
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">{t("acceptixExclusive")}</p>
              <p className="text-xs text-muted-foreground">
                {t("acceptixExclusiveDesc")}
              </p>
            </div>
            <Switch
              checked={watch("isExclusiveAcceptix") ?? false}
              onCheckedChange={(v) => setValue("isExclusiveAcceptix", v)}
            />
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">{t("active")}</p>
              <p className="text-xs text-muted-foreground">
                {t("activeCourseDesc")}
              </p>
            </div>
            <Switch
              checked={watch("isActive") ?? true}
              onCheckedChange={(v) => setValue("isActive", v)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              {t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminCoursesPage() {
  return (
    <RoleGate allowedRoles={["admin"]}>
      <AdminCoursesContent />
    </RoleGate>
  );
}
