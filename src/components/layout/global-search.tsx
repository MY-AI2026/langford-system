"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { subscribeToStudents } from "@/lib/services/student-service";
import { Student } from "@/lib/types";
import { StudentStatusBadge } from "@/components/students/student-status-badge";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { Phone } from "lucide-react";

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const router = useRouter();
  const { role, firebaseUser } = useAuth();
  const [query, setQuery] = useState("");
  const [students, setStudents] = useState<Student[]>([]);

  useEffect(() => {
    if (!role || !firebaseUser) return;

    const unsub = subscribeToStudents(
      {
        role,
        userId: firebaseUser.uid,
        showArchived: false,
        searchQuery: query || undefined,
      },
      (data) => {
        setStudents(data.slice(0, 20));
      }
    );

    return () => unsub();
  }, [role, firebaseUser, query]);

  const handleSelect = useCallback(
    (studentId: string) => {
      onOpenChange(false);
      setQuery("");
      router.push(`/students/${studentId}`);
    },
    [onOpenChange, router]
  );

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search Students"
      description="Search for a student by name or phone"
    >
      <CommandInput
        placeholder="Search by name or phone..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>No students found.</CommandEmpty>
        <CommandGroup heading="Students">
          {students.map((student) => (
            <CommandItem
              key={student.id}
              value={`${student.fullName} ${student.phone}`}
              onSelect={() => handleSelect(student.id)}
              className="flex items-center gap-3 py-2"
            >
              <div className="flex flex-1 flex-col gap-0.5 min-w-0">
                <span className="font-medium truncate">{student.fullName}</span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  {student.phone}
                </span>
              </div>
              <StudentStatusBadge status={student.status} />
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
