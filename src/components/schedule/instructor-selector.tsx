"use client";

import { useEffect, useState } from "react";
import { User } from "@/lib/types";
import { getInstructors } from "@/lib/services/schedule-service";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface InstructorSelectorProps {
  value: string | null;
  onChange: (instructorId: string, instructorName: string) => void;
}

export function InstructorSelector({ value, onChange }: InstructorSelectorProps) {
  const [instructors, setInstructors] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getInstructors()
      .then(setInstructors)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <Skeleton className="h-10 w-64" />;
  }

  return (
    <Select
      value={value || ""}
      onValueChange={(uid) => {
        const inst = instructors.find((i) => i.uid === uid);
        if (inst) onChange(inst.uid, inst.displayName);
      }}
    >
      <SelectTrigger className="w-64">
        <SelectValue placeholder="Select Instructor" />
      </SelectTrigger>
      <SelectContent>
        {instructors.map((inst) => (
          <SelectItem key={inst.uid} value={inst.uid}>
            {inst.displayName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
