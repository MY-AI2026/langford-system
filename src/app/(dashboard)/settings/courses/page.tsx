"use client";

import { useEffect, useState, useMemo } from "react";
import {
  subscribeToCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  CourseInput,
} from "@/lib/services/course-service";
import { Course, CourseCategory } from "@/lib/types";
import { useAuth } from "@/contexts/auth-context";
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
import { formatCurrency } from "@/lib/utils/format";

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
};

function CourseForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: CourseInput;
  onSave: (data: CourseInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<CourseInput>(initial);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Course name is required");
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Name *</Label>
        <Input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Course name"
        />
      </div>
      <div className="space-y-2">
        <Label>Category</Label>
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
        <Label>Description</Label>
        <Textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Course description"
          rows={3}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Duration</Label>
          <Input
            value={form.duration}
            onChange={(e) => setForm({ ...form, duration: e.target.value })}
            placeholder="e.g., 3 months"
          />
        </div>
        <div className="space-y-2">
          <Label>Level</Label>
          <Input
            value={form.level}
            onChange={(e) => setForm({ ...form, level: e.target.value })}
            placeholder="e.g., A1, B2"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Default Fees (KWD)</Label>
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
          <Label>Max Students</Label>
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
        <Label>Active</Label>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </form>
  );
}

function CoursesContent() {
  const { role } = useAuth();
  const isReadOnly = role === "accountant";
  const [courses, setCourses] = useState<Course[]>([]);
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

  const filteredCourses = useMemo(() => {
    if (categoryFilter === "all") return courses;
    return courses.filter((c) => (c.category || "other") === categoryFilter);
  }, [courses, categoryFilter]);

  async function handleSave(data: CourseInput) {
    try {
      if (editingCourse) {
        await updateCourse(editingCourse.id, data);
        toast.success("Course updated");
      } else {
        await createCourse(data);
        toast.success("Course created");
      }
      setDialogOpen(false);
      setEditingCourse(null);
    } catch {
      toast.error("Failed to save course");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteCourse(deleteTarget.id);
      toast.success("Course deleted");
    } catch {
      toast.error("Failed to delete course");
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
          {filteredCourses.length} course(s)
        </p>
        {!isReadOnly && (
          <Button
            onClick={() => {
              setEditingCourse(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Course
          </Button>
        )}
      </div>

      {filteredCourses.length === 0 ? (
        <div className="flex h-32 items-center justify-center rounded-lg border border-dashed">
          <p className="text-sm text-muted-foreground">No courses found</p>
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
                      {course.isActive ? "Active" : "Inactive"}
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
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    {course.duration && <span>Duration: {course.duration}</span>}
                    <span>Max: {course.maxStudents} students</span>
                    {course.defaultFees > 0 && (
                      <span>Fees: {formatCurrency(course.defaultFees)}</span>
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
              {editingCourse ? "Edit Course" : "Add Course"}
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
                  }
                : emptyForm
            }
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
            <DialogTitle>Delete Course?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete{" "}
            <strong>{deleteTarget?.name}</strong>? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function CoursesPage() {
  return (
    <RoleGate allowedRoles={["admin", "coordinator", "accountant"]}>
      <div className="space-y-6">
        <PageHeader
          title="Courses"
          description="Manage course and program offerings"
        />
        <CoursesContent />
      </div>
    </RoleGate>
  );
}
