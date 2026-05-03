"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { PageHeader } from "@/components/layout/page-header";
import { PipelineBoard } from "@/components/pipeline/pipeline-board";
import { RoleGate } from "@/components/auth/role-gate";
import { subscribeToStudents, updateStudentStatus } from "@/lib/services/student-service";
import { Student, StudentStatus } from "@/lib/types";
import { STUDENT_STATUS_CONFIG } from "@/lib/utils/constants";
import { toast } from "sonner";

export default function PipelinePage() {
  return (
    <RoleGate allowedRoles={["admin", "sales"]}>
      <PipelinePageContent />
    </RoleGate>
  );
}

function PipelinePageContent() {
  const { role, firebaseUser, userData } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);

  useEffect(() => {
    if (!firebaseUser || !role) return;

    const unsub = subscribeToStudents(
      { role, userId: firebaseUser.uid },
      setStudents
    );
    return () => unsub();
  }, [firebaseUser, role]);

  async function handleStatusChange(studentId: string, newStatus: StudentStatus) {
    if (!firebaseUser || !userData) return;
    try {
      await updateStudentStatus(studentId, newStatus, firebaseUser.uid, userData.displayName);
      toast.success(`Moved to ${STUDENT_STATUS_CONFIG[newStatus].label}`);
    } catch {
      toast.error("Failed to update status");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Pipeline"
        description="Drag and drop students between stages"
      />
      <PipelineBoard students={students} onStatusChange={handleStatusChange} />
    </div>
  );
}
