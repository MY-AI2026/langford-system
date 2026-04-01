"use client";

import { ActivityLogEntry } from "@/lib/types";
import { formatRelativeTime, formatDate } from "@/lib/utils/format";
import { ACTIVITY_TYPE_CONFIG } from "@/lib/utils/constants";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Clock,
  ArrowRightLeft,
  CreditCard,
  ClipboardCheck,
  Pencil,
  CheckCircle,
} from "lucide-react";

const iconMap: Record<string, React.ElementType> = {
  MessageSquare,
  Clock,
  ArrowRightLeft,
  CreditCard,
  ClipboardCheck,
  Pencil,
};

interface ActivityLogListProps {
  activities: ActivityLogEntry[];
}

export function ActivityLogList({ activities }: ActivityLogListProps) {
  if (activities.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-dashed">
        <p className="text-sm text-muted-foreground">No activity yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => {
        const config = ACTIVITY_TYPE_CONFIG[activity.type];
        const Icon = iconMap[config?.icon] || MessageSquare;

        return (
          <div
            key={activity.id}
            className="flex gap-3 rounded-lg border p-3"
          >
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm">{activity.description}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="text-[10px]">
                  {config?.label || activity.type}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {activity.createdByName}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatRelativeTime(activity.createdAt)}
                </span>
                {activity.type === "follow_up" && activity.followUpDate && (
                  <span className="flex items-center gap-1 text-xs">
                    {activity.isFollowUpDone ? (
                      <CheckCircle className="h-3 w-3 text-green-500" />
                    ) : (
                      <Clock className="h-3 w-3 text-yellow-500" />
                    )}
                    Follow-up: {formatDate(activity.followUpDate)}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
