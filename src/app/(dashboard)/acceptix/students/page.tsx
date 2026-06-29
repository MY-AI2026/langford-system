"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";
import { RoleGate } from "@/components/auth/role-gate";
import {
  subscribeToAllStudents,
  updateStudent,
  softDeleteStudent,
  commissionFor,
} from "@/lib/services/reg-student-service";
import { subscribeToActiveCourses } from "@/lib/services/reg-course-service";
import { subscribeToAcceptixAgents } from "@/lib/services/reg-agent-service";
import { RegStudent, RegStudentStatus, RegCourse, User } from "@/lib/types";
import {
  REG_STUDENT_STATUS_LABELS,
  REG_STATUS_ORDER,
  REG_DEFAULT_CURRENCY,
} from "@/lib/registration/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Search, Pencil, Trash2, Users } from "lucide-react";

function AdminStudentsContent() {
  const { t } = useLanguage();
  const { firebaseUser, userData } = useAuth();
  const [students, setStudents] = useState<RegStudent[]>([]);
  const [courses, setCourses] = useState<RegCourse[]>([]);
  const [agents, setAgents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<RegStudentStatus | "all">("all");
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [agentFilter, setAgentFilter] = useState<string>("all");

  // Edit dialog
  const [editing, setEditing] = useState<RegStudent | null>(null);
  const [editStatus, setEditStatus] = useState<RegStudentStatus>("new");
  const [editNotes, setEditNotes] = useState("");

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeToAllStudents(
      {
        status: statusFilter,
        courseId: courseFilter,
        searchQuery: search,
        agentUid: agentFilter,
      },
      (data) => {
        setStudents(data);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [statusFilter, courseFilter, search, agentFilter]);

  useEffect(() => {
    const unsub = subscribeToActiveCourses(setCourses);
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = subscribeToAcceptixAgents(setAgents);
    return () => unsub();
  }, []);

  // Totals — render-time so they reflect filters
  const totals = useMemo(() => {
    const totalFees = students.reduce((sum, s) => sum + (s.courseFee ?? 0), 0);
    const totalCommission = students.reduce((sum, s) => sum + commissionFor(s), 0);
    return { count: students.length, totalFees, totalCommission };
  }, [students]);

  function openEdit(s: RegStudent) {
    setEditing(s);
    setEditStatus(s.status);
    setEditNotes(s.notes ?? "");
  }

  async function handleEditSave() {
    if (!editing || !firebaseUser || !userData) return;
    try {
      await updateStudent(
        editing.id,
        { status: editStatus, notes: editNotes },
        { uid: firebaseUser.uid, displayName: userData.displayName, role: "admin" },
        {
          status: { from: editing.status, to: editStatus },
          notes: { from: editing.notes, to: editNotes },
        }
      );
      toast.success(t("studentUpdated"));
      setEditing(null);
    } catch (e) {
      console.error("[admin-students] update failed:", e);
      toast.error(t("updateFailed"));
    }
  }

  async function handleDelete(studentId: string) {
    if (!firebaseUser || !userData) return;
    try {
      await softDeleteStudent(studentId, {
        uid: firebaseUser.uid,
        displayName: userData.displayName,
        role: "admin",
      });
      toast.success(t("studentSoftDeleted"));
      setDeletingId(null);
    } catch (e) {
      console.error("[admin-students] delete failed:", e);
      toast.error(t("deleteFailed"));
    }
  }

  return (
    <div className="space-y-6" dir="ltr">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <Users className="h-6 w-6 text-primary" />
          {t("allStudents")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("allStudentsSubtitle")}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t("studentsFiltered")}</p>
            <p className="text-2xl font-bold">{totals.count.toLocaleString("en-US")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t("totalFees")}</p>
            <p className="text-2xl font-bold">
              {totals.totalFees.toLocaleString("en-US")} {REG_DEFAULT_CURRENCY}
            </p>
          </CardContent>
        </Card>
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t("totalCommission10")}</p>
            <p className="text-2xl font-bold text-primary">
              {totals.totalCommission.toLocaleString("en-US")} {REG_DEFAULT_CURRENCY}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("searchStudentsPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9"
            aria-label={t("search")}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as RegStudentStatus | "all")}>
          <SelectTrigger>
            <SelectValue placeholder={t("status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allStatuses")}</SelectItem>
            {REG_STATUS_ORDER.map((s) => (
              <SelectItem key={s} value={s}>
                {REG_STUDENT_STATUS_LABELS[s].en}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={courseFilter}
          onValueChange={(v) => setCourseFilter(v ?? "all")}
        >
          <SelectTrigger>
            <SelectValue placeholder={t("course")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allCourses")}</SelectItem>
            {courses.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={agentFilter}
          onValueChange={(v) => setAgentFilter(v ?? "all")}
        >
          <SelectTrigger>
            <SelectValue placeholder={t("agent")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allAgents")}</SelectItem>
            {agents.map((a) => (
              <SelectItem key={a.uid} value={a.uid}>
                {a.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : students.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {t("noStudentsMatchFilters")}
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("student")}</TableHead>
                <TableHead>{t("course")}</TableHead>
                <TableHead>{t("agent")}</TableHead>
                <TableHead>{t("commission")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead>{t("date")}</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">
                    {s.fullName}
                    <p className="text-xs text-muted-foreground" dir="ltr">
                      {s.phone}
                    </p>
                  </TableCell>
                  <TableCell>
                    {s.courseName}
                    <p className="text-xs text-muted-foreground" dir="ltr">
                      {s.courseFee > 0
                        ? `${s.courseFee.toLocaleString("en-US")} ${s.currency}`
                        : "—"}
                    </p>
                  </TableCell>
                  <TableCell>{s.createdByName}</TableCell>
                  <TableCell dir="ltr" className="font-medium text-primary">
                    {commissionFor(s).toLocaleString("en-US")} {s.currency || REG_DEFAULT_CURRENCY}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={`border-0 ${REG_STUDENT_STATUS_LABELS[s.status].color}`}
                    >
                      {REG_STUDENT_STATUS_LABELS[s.status].en}
                    </Badge>
                  </TableCell>
                  <TableCell dir="ltr">{formatDate(s.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(s)}
                        aria-label={t("edit")}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingId(s.id)}
                        aria-label={t("delete")}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent dir="ltr">
          <DialogHeader>
            <DialogTitle>{t("editStudent")}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="rounded-md bg-muted/50 p-3 text-sm">
                <p className="font-medium">{editing.fullName}</p>
                <p className="text-xs text-muted-foreground">
                  {editing.courseName} · {t("registeredBy")} {editing.createdByName}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t("status")}</label>
                <Select
                  value={editStatus}
                  onValueChange={(v) => setEditStatus(v as RegStudentStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REG_STATUS_ORDER.map((s) => (
                      <SelectItem key={s} value={s}>
                        {REG_STUDENT_STATUS_LABELS[s].en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t("notes")}</label>
                <Textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              {t("cancel")}
            </Button>
            <Button onClick={handleEditSave}>{t("save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <DialogContent dir="ltr">
          <DialogHeader>
            <DialogTitle>{t("deleteStudentQuestion")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("softDeleteExplanation")}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingId(null)}>
              {t("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingId && handleDelete(deletingId)}
            >
              {t("confirmDelete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function formatDate(value: unknown): string {
  if (!value) return "—";
  let d: Date;
  if (value instanceof Date) d = value;
  else if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    d = (value as { toDate: () => Date }).toDate();
  } else if (typeof value === "string") {
    d = new Date(value);
  } else {
    return "—";
  }
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function AdminStudentsPage() {
  return (
    <RoleGate allowedRoles={["admin"]}>
      <AdminStudentsContent />
    </RoleGate>
  );
}
