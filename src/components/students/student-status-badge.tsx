"use client";

import { Badge } from "@/components/ui/badge";
import { StudentStatus } from "@/lib/types";
import { STUDENT_STATUS_CONFIG } from "@/lib/utils/constants";
import { cn } from "@/lib/utils";

interface StudentStatusBadgeProps {
  status: StudentStatus;
}

export function StudentStatusBadge({ status }: StudentStatusBadgeProps) {
  const config = STUDENT_STATUS_CONFIG[status];
  return (
    <Badge
      variant="secondary"
      className={cn(config.bgColor, config.color, "border-0")}
    >
      {config.label}
    </Badge>
  );
}
