"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STUDENT_STATUS_CONFIG, STUDENT_STATUSES } from "@/lib/utils/constants";
import { StudentStatus } from "@/lib/types";
import { Search, X, CalendarRange } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface StudentSearchBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: StudentStatus | "all";
  onStatusFilterChange: (value: StudentStatus | "all") => void;
  showArchived: boolean;
  onShowArchivedChange: (value: boolean) => void;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  isAdmin?: boolean;
}

const QUICK_RANGES = [
  { label: "All", value: "all" },
  { label: "This Month", value: "this_month" },
  { label: "Last Month", value: "last_month" },
  { label: "This Year", value: "this_year" },
];

function getQuickRange(value: string): { from: string; to: string } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  if (value === "this_month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { from: fmt(from), to: fmt(to) };
  }
  if (value === "last_month") {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: fmt(from), to: fmt(to) };
  }
  if (value === "this_year") {
    return { from: `${now.getFullYear()}-01-01`, to: `${now.getFullYear()}-12-31` };
  }
  return { from: "", to: "" };
}

export function StudentSearchBar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  showArchived,
  onShowArchivedChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  isAdmin,
}: StudentSearchBarProps) {

  function applyQuickRange(value: string) {
    if (value === "all") {
      onDateFromChange("");
      onDateToChange("");
    } else {
      const { from, to } = getQuickRange(value);
      onDateFromChange(from);
      onDateToChange(to);
    }
  }

  const activeQuick = QUICK_RANGES.find((r) => {
    if (r.value === "all") return !dateFrom && !dateTo;
    const { from, to } = getQuickRange(r.value);
    return from === dateFrom && to === dateTo;
  })?.value ?? "";

  return (
    <div className="flex flex-col gap-3">
      {/* Row 1: search + status + archived */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
          {search && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
              onClick={() => onSearchChange("")}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        <Select
          value={statusFilter}
          onValueChange={(val) => onStatusFilterChange(val as StudentStatus | "all")}
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STUDENT_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {STUDENT_STATUS_CONFIG[status].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <Switch
              id="show-archived"
              checked={showArchived}
              onCheckedChange={onShowArchivedChange}
            />
            <Label htmlFor="show-archived" className="text-sm whitespace-nowrap">
              Show archived
            </Label>
          </div>
        )}
      </div>

      {/* Row 2: date filter */}
      <div className="flex flex-wrap items-center gap-2">
        <CalendarRange className="h-4 w-4 text-muted-foreground" />

        {/* Quick range buttons */}
        {QUICK_RANGES.map((r) => (
          <Button
            key={r.value}
            variant={activeQuick === r.value ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs"
            onClick={() => applyQuickRange(r.value)}
          >
            {r.label}
          </Button>
        ))}

        {/* Divider */}
        <span className="text-muted-foreground text-xs">or custom:</span>

        {/* Custom range */}
        <div className="flex items-center gap-1">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            className="h-8 w-36 text-xs"
          />
          <span className="text-muted-foreground text-xs">→</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            className="h-8 w-36 text-xs"
          />
          {(dateFrom || dateTo) && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => { onDateFromChange(""); onDateToChange(""); }}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
