"use client";

import { useMemo } from "react";
import { RegCourse, RegCourseCategory } from "@/lib/types";
import {
  REG_CATEGORY_LABELS,
  REG_CATEGORY_ORDER,
} from "@/lib/registration/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectGroup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CoursePickerProps {
  courses: RegCourse[];
  value: string;
  onChange: (courseId: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Course dropdown grouped by category, with the fee/currency rendered
 * inline so the agent can confirm pricing at a glance. Only ACTIVE courses
 * should be passed in (caller decides).
 */
export function CoursePicker({
  courses,
  value,
  onChange,
  placeholder = "اختر الكورس",
  disabled,
}: CoursePickerProps) {
  const grouped = useMemo(() => {
    const map = new Map<RegCourseCategory, RegCourse[]>();
    for (const c of courses) {
      const list = map.get(c.category) ?? [];
      list.push(c);
      map.set(c.category, list);
    }
    // Sort each group's courses by name for consistent ordering
    for (const list of map.values()) {
      list.sort((a, b) => a.name.localeCompare(b.name, "ar"));
    }
    return map;
  }, [courses]);

  return (
    <Select
      value={value || undefined}
      onValueChange={(v) => onChange(v ?? "")}
      disabled={disabled}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {REG_CATEGORY_ORDER.map((cat) => {
          const list = grouped.get(cat);
          if (!list || list.length === 0) return null;
          return (
            <SelectGroup key={cat}>
              <SelectLabel className="text-xs text-muted-foreground">
                {REG_CATEGORY_LABELS[cat].ar}
              </SelectLabel>
              {list.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  <div className="flex w-full items-center justify-between gap-3">
                    <span>{c.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {c.fee > 0
                        ? `${c.fee.toLocaleString("en-US")} ${c.currency}`
                        : "—"}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          );
        })}
      </SelectContent>
    </Select>
  );
}
