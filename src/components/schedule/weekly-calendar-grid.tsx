"use client";

import { useState } from "react";
import { ScheduleEntry, DayOfWeek } from "@/lib/types";
import { ScheduleEntryCard } from "./schedule-entry-card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

// Kuwait work week: Saturday to Thursday
const WEEK_DAYS: { value: DayOfWeek; label: string; short: string }[] = [
  { value: 6, label: "Saturday", short: "Sat" },
  { value: 0, label: "Sunday", short: "Sun" },
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
];

// Time slots from 10:00 to 22:00 (display 10 AM - 10 PM)
const HOURS = Array.from({ length: 12 }, (_, i) => i + 10); // 10..21

function formatHour(h: number): string {
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${h12} ${ampm}`;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

interface WeeklyCalendarGridProps {
  entries: ScheduleEntry[];
  editable?: boolean;
  onEdit?: (entry: ScheduleEntry) => void;
  onDelete?: (entry: ScheduleEntry) => void;
}

export function WeeklyCalendarGrid({
  entries,
  editable = false,
  onEdit,
  onDelete,
}: WeeklyCalendarGridProps) {
  const [mobileDay, setMobileDay] = useState<string>(String(WEEK_DAYS[0].value));

  function getEntriesForDay(day: DayOfWeek): ScheduleEntry[] {
    return entries.filter((e) => e.dayOfWeek === day);
  }

  // Calculate position and height for an entry
  function getEntryStyle(entry: ScheduleEntry) {
    const startMin = timeToMinutes(entry.startTime);
    const endMin = timeToMinutes(entry.endTime);
    const gridStart = 10 * 60; // 10:00 AM
    const rowHeight = 64; // px per hour

    const top = ((startMin - gridStart) / 60) * rowHeight;
    const height = ((endMin - startMin) / 60) * rowHeight;

    return {
      top: `${top}px`,
      height: `${Math.max(height, 32)}px`, // minimum height
    };
  }

  // Desktop Grid
  const desktopGrid = (
    <div className="hidden md:block overflow-x-auto">
      <div className="min-w-[700px]">
        {/* Header */}
        <div className="grid grid-cols-[72px_repeat(6,1fr)] border-b">
          <div className="p-2" />
          {WEEK_DAYS.map((day) => {
            const dayEntries = getEntriesForDay(day.value);
            return (
              <div
                key={day.value}
                className="border-l p-2 text-center"
              >
                <p className="text-sm font-semibold">{day.short}</p>
                {dayEntries.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {dayEntries.length} class{dayEntries.length !== 1 ? "es" : ""}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Time Grid */}
        <div className="relative grid grid-cols-[72px_repeat(6,1fr)]">
          {/* Time labels + horizontal lines */}
          {HOURS.map((h) => (
            <div
              key={h}
              className="col-span-full grid grid-cols-[72px_repeat(6,1fr)] border-b border-dashed border-muted"
              style={{ height: "64px" }}
            >
              <div className="flex items-start justify-end pr-2 pt-1 text-xs text-muted-foreground">
                {formatHour(h)}
              </div>
              {WEEK_DAYS.map((day) => (
                <div key={day.value} className="border-l" />
              ))}
            </div>
          ))}

          {/* Entries overlay */}
          {WEEK_DAYS.map((day, dayIndex) => {
            const dayEntries = getEntriesForDay(day.value);
            return (
              <div
                key={day.value}
                className="absolute top-0"
                style={{
                  left: `calc(72px + (100% - 72px) / 6 * ${dayIndex})`,
                  width: `calc((100% - 72px) / 6)`,
                  height: `${HOURS.length * 64}px`,
                }}
              >
                {dayEntries.map((entry) => {
                  const style = getEntryStyle(entry);
                  return (
                    <div
                      key={entry.id}
                      className="absolute inset-x-1"
                      style={{ top: style.top, height: style.height }}
                    >
                      <ScheduleEntryCard
                        entry={entry}
                        editable={editable}
                        onEdit={onEdit}
                        onDelete={onDelete}
                      />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // Mobile Tabs
  const mobileTabs = (
    <div className="md:hidden">
      <Tabs value={mobileDay} onValueChange={setMobileDay}>
        <TabsList className="w-full overflow-x-auto flex-nowrap justify-start">
          {WEEK_DAYS.map((day) => {
            const count = getEntriesForDay(day.value).length;
            return (
              <TabsTrigger
                key={day.value}
                value={String(day.value)}
                className="flex-shrink-0 gap-1"
              >
                {day.short}
                {count > 0 && (
                  <span className="ml-1 rounded-full bg-primary/10 px-1.5 text-xs font-medium">
                    {count}
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {WEEK_DAYS.map((day) => {
          const dayEntries = getEntriesForDay(day.value).sort((a, b) =>
            a.startTime.localeCompare(b.startTime)
          );
          return (
            <TabsContent key={day.value} value={String(day.value)} className="mt-3">
              {dayEntries.length === 0 ? (
                <div className="flex h-32 items-center justify-center rounded-lg border border-dashed">
                  <p className="text-sm text-muted-foreground">No classes</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {dayEntries.map((entry) => (
                    <div key={entry.id} className="h-24">
                      <ScheduleEntryCard
                        entry={entry}
                        editable={editable}
                        onEdit={onEdit}
                        onDelete={onDelete}
                      />
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );

  return (
    <div className="rounded-lg border bg-card">
      {desktopGrid}
      {mobileTabs}
    </div>
  );
}
