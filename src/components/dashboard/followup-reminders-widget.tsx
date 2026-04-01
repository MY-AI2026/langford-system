"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell } from "lucide-react";
import { formatDate } from "@/lib/utils/format";
import Link from "next/link";

export interface FollowUpItem {
  id: string;
  studentId: string;
  studentName: string;
  description: string;
  followUpDate: string; // ISO string
  createdByName: string;
  isOverdue: boolean;
}

interface FollowUpRemindersWidgetProps {
  items: FollowUpItem[];
}

export function FollowUpRemindersWidget({ items }: FollowUpRemindersWidgetProps) {
  const overdueCount = items.filter((i) => i.isOverdue).length;
  const todayCount = items.filter((i) => !i.isOverdue).length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Follow-up Reminders</CardTitle>
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-orange-500" />
          {items.length > 0 && (
            <Badge
              variant="destructive"
              className="rounded-full px-1.5 py-0 text-xs leading-5"
            >
              {items.length}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending follow-ups today</p>
        ) : (
          <div className="space-y-2">
            {(overdueCount > 0 || todayCount > 0) && (
              <div className="flex gap-3 text-xs mb-2">
                {overdueCount > 0 && (
                  <span className="text-red-600 font-medium">
                    {overdueCount} overdue
                  </span>
                )}
                {todayCount > 0 && (
                  <span className="text-orange-600 font-medium">
                    {todayCount} due today
                  </span>
                )}
              </div>
            )}
            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
              {items.slice(0, 8).map((item) => (
                <Link
                  key={item.id}
                  href={`/students/${item.studentId}`}
                  className="flex items-start justify-between rounded-md p-2 text-sm hover:bg-muted gap-2"
                >
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium truncate">{item.studentName}</span>
                    <span className="text-xs text-muted-foreground truncate">
                      {item.description}
                    </span>
                  </div>
                  <span
                    className={`text-xs shrink-0 mt-0.5 ${
                      item.isOverdue
                        ? "text-red-600 font-semibold"
                        : "text-orange-600 font-medium"
                    }`}
                  >
                    {item.isOverdue ? `↑ ${formatDate(item.followUpDate)}` : "Today"}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
