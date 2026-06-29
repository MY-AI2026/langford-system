"use client";

import { useEffect, useState, useMemo } from "react";
import {
  subscribeToCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  CourseInput,
} from "@/lib/services/course-service";
import { subscribeToUsers } from "@/lib/services/user-service";
import { Course, CourseCategory, User } from "@/lib/types";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";
import { RoleGate } from "@/components/auth/role-gate";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/utils/format";

function toDateInputValue(value: unknown): string {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString().split("T")[0];
  if (typeof value === "string") return value.split("T")[0];
  if (typeof (value as { toDate?: () => Date }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toISOString().split("T")[0];
  }
  return "";
}

const CATEGORY_OPTIONS: { value: CourseCategory; label: string }[] = [
  { value: "general_english", label: "General English" },
  { value: "exam_prep", label: "Exam Prep" },
  { value: "professional", label: "Professional" },
  { value: "diploma", label: "Diploma" },
  { value: "other", label: "Other" },
];

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

const FILTER_TABS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "general_english", label: "General English" },
  { value: "exam_prep", label: "Exam Prep" },
  { value: "professional", label: "Professional" },
  { value: "diploma", label: "Diploma" },
  { value: "other", label: "Other" },
];

const emptyForm: CourseInput = {
  name: "",
  description: "",
  category: "general_english",
  duration: "",
  level: "",
  defaultFees: 0,
  maxStudents: 20,
  isActive: true,
  instructorId: "",
  instructorName: "",
  startDate: null,
  endDate: null,
};

const UNASSIGNED_INSTRUCTOR = "__none__";

function CourseForm({
  initial,
  instructors,
  onSave,
  onCancel,
}: {
  initial: CourseInput;
  instructors: User[];
  onSave: (data: CourseInput) => Promise<void>;
  onCancel: () => void;
}) {
  const { t } = useLanguage();
  const [form, setForm] = useState<CourseInput>(initial);
  const [startDateStr, setStartDateStr] = useState<string>(
    toDateInputValue(initial.startDate)
  );
  const [endDateStr, setEndDateStr] = useState<string>(
    toDateInputValue(initial.endDate)
  );
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error(t("courseNameRequired"));
      return;
    }
    if (startDateStr && endDateStr && endDateStr < startDateStr) {
      toast.error(t("endDateAfterStartDate"));
      return;
    }
    setSaving(true);
    try {
      await onSave({
        ...form,
        startDate: startDateStr ? new Date(startDateStr) : null,
        endDate: endDateStr ? new Date(endDateStr) : null,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>{t("name")} *</Label>
        <Input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder={t("courseNamePlaceholder")}
        />
      </div>
      <div className="space-y-2">
        <Label>{t("category")}</Label>
        <Select
          value={form.category || "general_english"}
          onValueChange={(val) => setForm({ ...form, category: val as CourseCategory })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_OPTIONS.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>{t("description")}</Label>
        <Textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder={t("courseDescriptionPlaceholder")}
          rows={3}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>{t("duration")}</Label>
          <Input
            value={form.duration}
            onChange={(e) => setForm({ ...form, duration: e.target.value })}
            placeholder={t("durationPlaceholder")}
          />
        </div>
        <div className="space-y-2">
          <Label>{t("level")}</Label>
          <Input
            value={form.level}
            onChange={(e) => setForm({ ...form, level: e.target.value })}
            placeholder={t("levelPlaceholder")}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>{t("startDate")}</Label>
          <Input
            type="date"
            value={startDateStr}
            onChange={(e) => setStartDateStr(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>{t("endDate")}</Label>
          <Input
            type="date"
            value={endDateStr}
            onChange={(e) => setEndDateStr(e.target.value)}
            min={startDateStr || undefined}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground -mt-2">
        {t("courseDatesHint")}
      </p>
      <div className="space-y-2">
        <Label>{t("assignedInstructor")}</Label>
        <Select
          value={form.instructorId || UNASSIGNED_INSTRUCTOR}
          onValueChange={(val) => {
            const id = val ?? UNASSIGNED_INSTRUCTOR;
            if (id === UNASSIGNED_INSTRUCTOR) {
              setForm({ ...form, instructorId: "", instructorName: "" });
            } else {
              const chosen = instructors.find((u) => u.uid === id);
              setForm({
                ...form,
                instructorId: id,
                instructorName: chosen?.displayName || "",
              });
            }
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder={t("selectInstructorOptional")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNASSIGNED_INSTRUCTOR}>{t("unassigned")}</SelectItem>
            {instructors.map((u) => (
              <SelectItem key={u.uid} value={u.uid}>
                {u.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {t("assignedInstructorHint")}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>{t("defaultFees")} (KWD)</Label>
          <Input
            type="number"
            step="0.001"
            min="0"
            value={form.defaultFees}
            onChange={(e) =>
              setForm({ ...form, defaultFees: parseFloat(e.target.value) || 0 })
            }
            placeholder="0.000"
          />
        </div>
        <div className="space-y-2">
          <Label>{t("maxStudents")}</Label>
          <Input
            type="number"
            min="1"
            value={form.maxStudents}
            onChange={(e) =>
              setForm({ ...form, maxStudents: parseInt(e.target.value) || 1 })
            }
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Switch
          checked={form.isActive}
          onCheckedChange={(checked) => setForm({ ...form, isActive: checked })}
        />
        <Label>{t("active")}</Label>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("cancel")}
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? t("saving") : t("save")}
        </Button>
      </div>
    </form>
  );
}

function CoursesContent() {
  const { role } = useAuth();
  const { t } = useLanguage();
  const isReadOnly = role === "accountant";
  const [courses, setCourses] = useState<Course[]>([]);
  const [instructors, setInstructors] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("all");

  useEffect(() => {
    const unsub = subscribeToCourses((data) => {
      setCourses(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = subscribeToUsers((users) => {
      setInstructors(users.filter((u) => u.role === "instructor" && u.isActive !== false));
    });
    return () => unsub();
  }, []);

  const filteredCourses = useMemo(() => {
    if (categoryFilter === "all") return courses;
    return courses.filter((c) => (c.category || "other") === categoryFilter);
  }, [courses, categoryFilter]);

  async function handleSave(data: CourseInput) {
    try {
      if (editingCourse) {
        await updateCourse(editingCourse.id, data);
        toast.success(t("courseUpdated"));
      } else {
        await createCourse(data);
        toast.success(t("courseCreated"));
      }
      setDialogOpen(false);
      setEditingCourse(null);
    } catch {
      toast.error(t("failedToSaveCourse"));
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteCourse(deleteTarget.id);
      toast.success(t("courseDeleted"));
    } catch {
      toast.error(t("failedToDeleteCourse"));
    } finally {
      setDeleteTarget(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Category filter tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {FILTER_TABS.map((tab) => (
          <Button
            key={tab.value}
            size="sm"
            variant={categoryFilter === tab.value ? "default" : "outline"}
            onClick={() => setCategoryFilter(tab.value)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Header with count and add button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filteredCourses.length} {t("coursesCount")}
        </p>
        {!isReadOnly && (
          <Button
            onClick={() => {
              setEditingCourse(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t("addCourse")}
          </Button>
        )}
      </div>

      {filteredCourses.length === 0 ? (
        <div className="flex h-32 items-center justify-center rounded-lg border border-dashed">
          <p className="text-sm text-muted-foreground">{t("noCoursesFound")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCourses.map((course) => (
            <Card key={course.id}>
              <CardContent className="flex items-start justify-between pt-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{course.name}</span>
                    <Badge variant={course.isActive ? "default" : "secondary"}>
                      {course.isActive ? t("active") : t("inactive")}
                    </Badge>
                    {course.category && (
                      <Badge variant="outline">
                        {CATEGORY_LABELS[course.category] || course.category}
                      </Badge>
                    )}
                    {course.level && (
                      <Badge variant="outline">{course.level}</Badge>
                    )}
                  </div>
                  {course.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {course.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                    {course.instructorName ? (
                      <span className="text-blue-700 dark:text-blue-300">
                        👨‍🏫 {course.instructorName}
                      </span>
                    ) : (
                      <span className="text-amber-700 dark:text-amber-400">
                        ⚠️ {t("noInstructorAssigned")}
                      </span>
                    )}
                    {course.duration && <span>{t("duration")}: {course.duration}</span>}
                    {(course.startDate || course.endDate) && (
                      <span>
                        📅 {course.startDate ? formatDate(course.startDate) : "—"}
                        {" → "}
                        {course.endDate ? formatDate(course.endDate) : "—"}
                      </span>
                    )}
                    <span>{t("max")}: {course.maxStudents} {t("studentsLabel")}</span>
                    {course.defaultFees > 0 && (
                      <span>{t("feesLabel")}: {formatCurrency(course.defaultFees)}</span>
                    )}
                  </div>
                </div>
                {!isReadOnly && (
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditingCourse(course);
                        setDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setDeleteTarget(course)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingCourse(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingCourse ? t("editCourse") : t("addCourse")}
            </DialogTitle>
          </DialogHeader>
          <CourseForm
            initial={
              editingCourse
                ? {
                    name: editingCourse.name,
                    description: editingCourse.description,
                    category: editingCourse.category || "general_english",
                    duration: editingCourse.duration,
                    level: editingCourse.level,
                    defaultFees: editingCourse.defaultFees || 0,
                    maxStudents: editingCourse.maxStudents,
                    isActive: editingCourse.isActive,
                    instructorId: editingCourse.instructorId || "",
                    instructorName: editingCourse.instructorName || "",
                    startDate: editingCourse.startDate
                      ? editingCourse.startDate.toDate()
                      : null,
                    endDate: editingCourse.endDate
                      ? editingCourse.endDate.toDate()
                      : null,
                  }
                : emptyForm
            }
            instructors={instructors}
            onSave={handleSave}
            onCancel={() => {
              setDialogOpen(false);
              setEditingCourse(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteCourseQuestion")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("deleteCourseConfirm")}{" "}
            <strong>{deleteTarget?.name}</strong>? {t("thisActionCannotBeUndone")}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              {t("cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              {t("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function CoursesPage() {
  const { t } = useLanguage();
  return (
    <RoleGate allowedRoles={["admin", "coordinator", "accountant"]}>
      <div className="space-y-6">
        <PageHeader
          title={t("courses")}
          description={t("coursesDescription")}
        />
        <CoursesContent />
      </div>
    </RoleGate>
  );
}
