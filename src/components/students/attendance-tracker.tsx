"use client";

import { useEffect, useState } from "react";
import {
  subscribeToAttendance,
  addSession,
  updateSession,
  AttendanceSession,
} from "@/lib/services/attendance-service";
import { formatDate } from "@/lib/utils/format";
import { useLanguage } from "@/contexts/language-context";
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
  const { t } = useLanguage();
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
      toast.error(t("pleaseSelectDate"));
      return;
    }
    setSaving(true);
    try {
      await addSession(studentId, new Date(sessionDate), sessionPresent);
      toast.success(t("sessionAdded"));
      setAddDialogOpen(false);
      setSessionDate(new Date().toISOString().split("T")[0]);
      setSessionPresent(true);
    } catch {
      toast.error(t("failedToAddSession"));
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(session: AttendanceSession) {
    setToggling(session.id);
    try {
      await updateSession(studentId, session.id, !session.isPresent);
    } catch {
      toast.error(t("failedToUpdateSession"));
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
              <p className="text-sm font-medium">{t("attendanceRate")}</p>
              <p className="text-2xl font-bold">{attendanceRate}%</p>
              <p className="text-xs text-muted-foreground">
                {presentSessions} / {totalSessions} {t("sessions")}
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setAddDialogOpen(true)}>
              <Plus className="me-2 h-4 w-4" />
              {t("addSession")}
            </Button>
          </div>
          <Progress value={attendanceRate} className="h-2" />
        </CardContent>
      </Card>

      {/* Sessions list */}
      {sessions.length === 0 ? (
        <div className="flex h-24 items-center justify-center rounded-lg border border-dashed">
          <p className="text-sm text-muted-foreground">{t("noSessionsRecorded")}</p>
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
                {session.isPresent ? t("present") : t("absent")}
              </Badge>
              <Button
                size="icon"
                variant="ghost"
                disabled={toggling === session.id}
                onClick={() => handleToggle(session)}
                title={session.isPresent ? t("markAsAbsent") : t("markAsPresent")}
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
            <DialogTitle>{t("addSession")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("date")}</Label>
              <Input
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3">
              <Label>{t("attendance")}</Label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={sessionPresent ? "default" : "outline"}
                  onClick={() => setSessionPresent(true)}
                >
                  {t("present")}
                </Button>
                <Button
                  size="sm"
                  variant={!sessionPresent ? "destructive" : "outline"}
                  onClick={() => setSessionPresent(false)}
                >
                  {t("absent")}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={handleAddSession} disabled={saving}>
              {saving ? t("saving") : t("add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
