"use client";

import { useEffect, useState } from "react";
import {
  subscribeToAttendance,
  addSession,
  updateSession,
  AttendanceSession,
} from "@/lib/services/attendance-service";
import { formatDate } from "@/lib/utils/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Timestamp } from "firebase/firestore";

interface AttendanceTrackerProps {
  studentId: string;
}

export function AttendanceTracker({ studentId }: AttendanceTrackerProps) {
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [sessionDate, setSessionDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [sessionPresent, setSessionPresent] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeToAttendance(studentId, (data) => {
      setSessions(data);
      setLoading(false);
    });
    return () => unsub();
  }, [studentId]);

  const totalSessions = sessions.length;
  const presentSessions = sessions.filter((s) => s.isPresent).length;
  const attendanceRate =
    totalSessions > 0 ? Math.round((presentSessions / totalSessions) * 100) : 0;

  async function handleAddSession() {
    if (!sessionDate) {
      toast.error("Please select a date");
      return;
    }
    setSaving(true);
    try {
      await addSession(studentId, new Date(sessionDate), sessionPresent);
      toast.success("Session added");
      setAddDialogOpen(false);
      setSessionDate(new Date().toISOString().split("T")[0]);
      setSessionPresent(true);
    } catch {
      toast.error("Failed to add session");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(session: AttendanceSession) {
    setToggling(session.id);
    try {
      await updateSession(studentId, session.id, !session.isPresent);
    } catch {
      toast.error("Failed to update session");
    } finally {
      setToggling(null);
    }
  }

  if (loading) {
    return <Skeleton className="h-32 w-full" />;
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-medium">Attendance Rate</p>
              <p className="text-2xl font-bold">{attendanceRate}%</p>
              <p className="text-xs text-muted-foreground">
                {presentSessions} / {totalSessions} sessions
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Session
            </Button>
          </div>
          <Progress value={attendanceRate} className="h-2" />
        </CardContent>
      </Card>

      {/* Sessions list */}
      {sessions.length === 0 ? (
        <div className="flex h-24 items-center justify-center rounded-lg border border-dashed">
          <p className="text-sm text-muted-foreground">No sessions recorded</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="flex items-center justify-between rounded-lg border px-4 py-2"
            >
              <span className="text-sm">{formatDate(session.date)}</span>
              <Badge
                variant={session.isPresent ? "default" : "destructive"}
                className="w-16 justify-center"
              >
                {session.isPresent ? "Present" : "Absent"}
              </Badge>
              <Button
                size="icon"
                variant="ghost"
                disabled={toggling === session.id}
                onClick={() => handleToggle(session)}
                title={session.isPresent ? "Mark as absent" : "Mark as present"}
              >
                {session.isPresent ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add Session Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Session</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3">
              <Label>Attendance</Label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={sessionPresent ? "default" : "outline"}
                  onClick={() => setSessionPresent(true)}
                >
                  Present
                </Button>
                <Button
                  size="sm"
                  variant={!sessionPresent ? "destructive" : "outline"}
                  onClick={() => setSessionPresent(false)}
                >
                  Absent
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddSession} disabled={saving}>
              {saving ? "Saving..." : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
