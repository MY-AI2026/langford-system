"use client";

import { Student } from "@/lib/types";
import { formatPhone, formatRelativeTime } from "@/lib/utils/format";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone } from "lucide-react";
import Link from "next/link";

interface PipelineCardProps {
  student: Student;
}

export function PipelineCard({ student }: PipelineCardProps) {
  return (
    <Link href={`/students/${student.id}`}>
      <Card className="cursor-pointer transition-shadow hover:shadow-md">
        <CardContent className="p-3">
          <p className="font-medium text-sm truncate">{student.fullName}</p>
          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Phone className="h-3 w-3" />
            {formatPhone(student.phone)}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <Badge variant="secondary" className="text-[10px]">
              {student.leadSource}
            </Badge>
            <span className="text-[10px] text-muted-foreground">
              {formatRelativeTime(student.updatedAt)}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
