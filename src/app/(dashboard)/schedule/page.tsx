"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { ScheduleEntry } from "@/lib/types";
import {
  subscribeToSchedulesByInstructor,
  subscribeToAllSchedules,
  deleteScheduleEntry,
  deleteSchedulePattern,
} from "@/lib/services/schedule-service";
import { RoleGate } from "@/components/auth/role-gate";
import { PageHeader } from "@/components/layout/page-header";
import { WeeklyCalendarGrid } from "@/components/schedule/weekly-calendar-grid";
import { InstructorSelector } from "@/components/schedule/instructor-selector";
import { ScheduleEntryForm } from "@/components/schedule/schedule-entry-form";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, CalendarDays } from "lucide-react";
import { toast } from "sonner";

function CoordinatorScheduleView() {
  const { firebaseUser } = useAuth();
  const [selectedInstructorId, setSelectedInstructorId] = useState<string | null>(null);
  const [selectedInstructorName, setSelectedInstructorName] = useState("");
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<ScheduleEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ScheduleEntry | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!selectedInstructorId) {
      setEntries([]);
      return;
    }
    setLoading(true);
    const unsub = subscribeToSchedulesByInstructor(selectedInstructorId, (data) => {
      setEntries(data);
      setLoading(false);
    });
    return () => unsub();
  }, [selectedInstructorId, refreshKey]);

  function handleEdit(entry: ScheduleEntry) {
    setEditEntry(entry);
    setFormOpen(true);
  }

  function handleAddNew() {
    setEditEntry(null);
    setFormOpen(true);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.patternGroupId) {
        await deleteSchedulePattern(deleteTarget.patternGroupId);
        toast.success("Pattern entries deleted");
      } else {
        await deleteScheduleEntry(deleteTarget.id);
        toast.success("Schedule entry deleted");
      }
      setRefreshKey((k) => k + 1);
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleteTarget(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <InstructorSelector
          value={selectedInstructorId}
          onChange={(id, name) => {
            setSelectedInstructorId(id);
            setSelectedInstructorName(name);
          }}
        />
        {selectedInstructorId && (
          <Button onClick={handleAddNew}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add to Schedule
          </Button>
        )}
      </div>

      {!selectedInstructorId ? (
        <div className="flex h-64 items-center justify-center rounded-lg border border-dashed">
          <div className="text-center">
            <CalendarDays className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">
              Select an instructor to view their schedule
            </p>
          </div>
        </div>
      ) : loading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      ) : (
        <WeeklyCalendarGrid
          entries={entries}
          editable
          onEdit={handleEdit}
          onDelete={setDeleteTarget}
        />
      )}

      {selectedInstructorId && (
        <ScheduleEntryForm
          open={formOpen}
          onOpenChange={setFormOpen}
          instructorId={selectedInstructorId}
          instructorName={selectedInstructorName}
          editEntry={editEntry}
          createdBy={firebaseUser?.uid || ""}
          onSuccess={() => setRefreshKey((k) => k + 1)}
        />
      )}

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Schedule Entry</DialogTitle>
            <DialogDescription>
              {deleteTarget?.patternGroupId
                ? "This entry is part of a day pattern. All related entries (e.g., Sat-Mon-Wed) will be deleted."
                : "Are you sure you want to delete this schedule entry?"}
            </DialogDescription>
          </DialogHeader>
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

function InstructorScheduleView() {
  const { firebaseUser } = useAuth();
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseUser) return;
    const unsub = subscribeToSchedulesByInstructor(firebaseUser.uid, (data) => {
      setEntries(data);
      setLoading(false);
    });
    return () => unsub();
  }, [firebaseUser]);

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed">
        <div className="text-center">
          <CalendarDays className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">
            No schedule entries yet
          </p>
        </div>
      </div>
    );
  }

  return <WeeklyCalendarGrid entries={entries} />;
}

export default function SchedulePage() {
  const { role } = useAuth();
  const isManager = role === "admin" || role === "coordinator";

  return (
    <RoleGate allowedRoles={["admin", "coordinator", "instructor"]}>
      <div className="space-y-6">
        <PageHeader
          title="Weekly Schedule"
          description={
            isManager
              ? "Manage instructor weekly schedules"
              : "Your weekly class schedule"
          }
        />
        {isManager ? <CoordinatorScheduleView /> : <InstructorScheduleView />}
      </div>
    </RoleGate>
  );
}
