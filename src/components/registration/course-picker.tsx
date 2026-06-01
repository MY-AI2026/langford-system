"use client";

import { useMemo, useState } from "react";
import { RegCourse, RegCourseCategory } from "@/lib/types";
import {
  REG_CATEGORY_LABELS,
  REG_CATEGORY_ORDER,
  REG_DEFAULT_CURRENCY,
} from "@/lib/registration/constants";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  ChevronsUpDown,
  GraduationCap,
  Search,
  Sparkles,
} from "lucide-react";

interface CoursePickerProps {
  courses: RegCourse[];
  value: string;
  onChange: (courseId: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const DEFAULT_PLACEHOLDER = "Select a course";

/**
 * Course picker with a roomy, searchable, category-grouped dropdown.
 *
 * Replaces the cramped native <Select> popup — the catalogue can run to
 * 30+ entries, so we want:
 *   - generous width that doesn't match the trigger
 *   - per-category sections with prominent headers
 *   - course name + tier badge + fee on each row
 *   - quick search across name, category, and tier
 *   - keyboard navigation friendly (closes on pick)
 */
export function CoursePicker({
  courses,
  value,
  onChange,
  placeholder = DEFAULT_PLACEHOLDER,
  disabled,
}: CoursePickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter((c) => {
      const haystack = `${c.name} ${REG_CATEGORY_LABELS[c.category].en} ${c.durationLabel}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [courses, query]);

  const grouped = useMemo(() => {
    const map = new Map<RegCourseCategory, RegCourse[]>();
    for (const c of filtered) {
      const list = map.get(c.category) ?? [];
      list.push(c);
      map.set(c.category, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.name.localeCompare(b.name, "en"));
    }
    return map;
  }, [filtered]);

  const selected = useMemo(
    () => courses.find((c) => c.id === value) ?? null,
    [courses, value]
  );

  function handlePick(id: string) {
    onChange(id);
    setOpen(false);
    setQuery("");
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        disabled={disabled}
        aria-expanded={open}
        className="flex h-11 w-full items-center justify-between rounded-md border bg-background px-3 text-sm shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50"
      >
        {selected ? (
          <span className="flex min-w-0 flex-1 items-center gap-2">
            <GraduationCap className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate text-left">{selected.name}</span>
            {selected.fee > 0 && (
              <Badge variant="secondary" className="ml-auto border-0">
                {selected.fee.toLocaleString("en-US")}{" "}
                {selected.currency || REG_DEFAULT_CURRENCY}
              </Badge>
            )}
          </span>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </PopoverTrigger>

      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] min-w-[420px] p-0"
        align="start"
        sideOffset={6}
      >
        {/* Search */}
        <div className="border-b p-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Search courses, tier, or category…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        {/* Body */}
        <div className="max-h-[420px] overflow-y-auto p-1">
          {courses.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No courses available — admin must seed the catalogue first.
            </p>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No courses match &ldquo;{query}&rdquo;.
            </p>
          ) : (
            REG_CATEGORY_ORDER.map((cat) => {
              const list = grouped.get(cat);
              if (!list || list.length === 0) return null;
              return (
                <div key={cat} className="mb-1">
                  <div className="sticky top-0 z-10 bg-muted/70 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur">
                    {REG_CATEGORY_LABELS[cat].en}
                  </div>
                  <ul>
                    {list.map((c) => {
                      const isSelected = c.id === value;
                      const isPrivate = /private/i.test(c.durationLabel);
                      const isGroup = /group/i.test(c.durationLabel);
                      const isPackage = /package/i.test(c.durationLabel);
                      return (
                        <li key={c.id}>
                          <button
                            type="button"
                            onClick={() => handlePick(c.id)}
                            className={[
                              "flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-muted",
                              isSelected ? "bg-primary/5" : "",
                            ].join(" ")}
                          >
                            <div className="mt-0.5 shrink-0">
                              {isSelected ? (
                                <Check className="h-4 w-4 text-primary" />
                              ) : (
                                <span className="block h-4 w-4" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="truncate text-sm font-medium">
                                  {c.name}
                                </span>
                                {c.isExclusiveAcceptix && (
                                  <Badge
                                    variant="secondary"
                                    className="shrink-0 border-0 bg-amber-100 text-[10px] text-amber-800"
                                  >
                                    <Sparkles className="mr-0.5 h-3 w-3" />
                                    ESP
                                  </Badge>
                                )}
                                {isGroup && (
                                  <Badge
                                    variant="secondary"
                                    className="shrink-0 border-0 bg-blue-50 text-[10px] text-blue-700"
                                  >
                                    Group
                                  </Badge>
                                )}
                                {isPrivate && (
                                  <Badge
                                    variant="secondary"
                                    className="shrink-0 border-0 bg-purple-50 text-[10px] text-purple-700"
                                  >
                                    Private
                                  </Badge>
                                )}
                                {isPackage && (
                                  <Badge
                                    variant="secondary"
                                    className="shrink-0 border-0 bg-emerald-50 text-[10px] text-emerald-700"
                                  >
                                    Package
                                  </Badge>
                                )}
                              </div>
                              {c.description && (
                                <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                                  {c.description}
                                </p>
                              )}
                            </div>
                            <div className="shrink-0 text-right">
                              <div className="text-sm font-semibold">
                                {c.fee > 0
                                  ? `${c.fee.toLocaleString("en-US")} ${c.currency || REG_DEFAULT_CURRENCY}`
                                  : "—"}
                              </div>
                              {c.fee > 0 && (
                                <div className="text-[10px] text-muted-foreground">
                                  Commission{" "}
                                  {Math.round(c.fee * 0.1 * 1000) / 1000}{" "}
                                  {c.currency || REG_DEFAULT_CURRENCY}
                                </div>
                              )}
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })
          )}
        </div>

        {/* Footer count */}
        {courses.length > 0 && (
          <div className="border-t px-3 py-2 text-[11px] text-muted-foreground">
            {filtered.length} of {courses.length} courses
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
