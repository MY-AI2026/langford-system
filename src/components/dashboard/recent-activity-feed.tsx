"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ACTIVITY_TYPE_CONFIG } from "@/lib/utils/constants";
import { formatRelativeTime } from "@/lib/utils/format";
import { ActivityLogEntry } from "@/lib/types";

interface RecentActivityFeedProps {
  activities: ActivityLogEntry[];
}

export function RecentActivityFeed({ activities }: RecentActivityFeedProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent activity</p>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 rounded-lg p-2 hover:bg-muted/50"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{activity.description}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">
                      {ACTIVITY_TYPE_CONFIG[activity.type]?.label || activity.type}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {activity.createdByName} &middot;{" "}
                      {formatRelativeTime(activity.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
