"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { regStudentSchema, RegStudentFormData } from "@/lib/utils/validators";
import { subscribeToActiveCourses } from "@/lib/services/reg-course-service";
import { RegCourse } from "@/lib/types";
import {
  ACCEPTIX_COMMISSION_RATE,
  REG_DEFAULT_CURRENCY,
  computeCommission,
} from "@/lib/registration/constants";
import { CoursePicker } from "./course-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, GraduationCap, Sparkles } from "lucide-react";

interface RegisterStudentFormProps {
  /**
   * Called with the validated form data + a generated idempotency key.
   * The key is fresh per mount, so React-Strict-Mode double-fires or a
   * jittery network retry can't accidentally double-write the same student.
   */
  onSubmit: (
    data: RegStudentFormData & { idempotencyKey: string }
  ) => Promise<void>;
  /** Reset the form to empty after a successful submit. Default: true. */
  resetOnSuccess?: boolean;
}

export function RegisterStudentForm({
  onSubmit,
  resetOnSuccess = true,
}: RegisterStudentFormProps) {
  const [courses, setCourses] = useState<RegCourse[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [idempotencyKey, setIdempotencyKey] = useState(() => makeIdempotencyKey());

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RegStudentFormData>({
    resolver: zodResolver(regStudentSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      email: "",
      courseId: "",
      notes: "",
    },
  });

  useEffect(() => {
    const unsub = subscribeToActiveCourses((data) => {
      setCourses(data);
      setLoadingCourses(false);
    });
    return () => unsub();
  }, []);

  const selectedCourseId = watch("courseId");
  const selectedCourse = useMemo(
    () => courses.find((c) => c.id === selectedCourseId) ?? null,
    [courses, selectedCourseId]
  );
  const commissionPreview = selectedCourse
    ? computeCommission(selectedCourse.fee ?? 0, ACCEPTIX_COMMISSION_RATE)
    : 0;

  async function handleFormSubmit(data: RegStudentFormData) {
    await onSubmit({ ...data, idempotencyKey });

    if (resetOnSuccess) {
      setIdempotencyKey(makeIdempotencyKey());
      reset();
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6" dir="ltr">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="fullName">
            Student Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="fullName"
            placeholder="Full name"
            autoComplete="off"
            {...register("fullName")}
            aria-invalid={!!errors.fullName}
            aria-describedby={errors.fullName ? "fullName-error" : undefined}
          />
          {errors.fullName && (
            <p id="fullName-error" className="text-sm text-destructive">
              {errors.fullName.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">
            Phone <span className="text-destructive">*</span>
          </Label>
          <Input
            id="phone"
            type="tel"
            inputMode="tel"
            placeholder="e.g. 9XXXXXXX"
            autoComplete="off"
            {...register("phone")}
            aria-invalid={!!errors.phone}
            aria-describedby={errors.phone ? "phone-error" : undefined}
          />
          {errors.phone && (
            <p id="phone-error" className="text-sm text-destructive">
              {errors.phone.message}
            </p>
          )}
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="email">Email (optional)</Label>
          <Input
            id="email"
            type="email"
            placeholder="student@example.com"
            autoComplete="off"
            {...register("email")}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
          />
          {errors.email && (
            <p id="email-error" className="text-sm text-destructive">
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label>
            Course <span className="text-destructive">*</span>
          </Label>
          <CoursePicker
            courses={courses}
            value={watch("courseId") || ""}
            onChange={(val) =>
              setValue("courseId", val, { shouldValidate: true })
            }
            placeholder={loadingCourses ? "Loading courses…" : "Select a course"}
            disabled={loadingCourses}
          />
          {errors.courseId && (
            <p className="text-sm text-destructive">{errors.courseId.message}</p>
          )}
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea
            id="notes"
            placeholder="Any additional notes about the student"
            rows={3}
            {...register("notes")}
          />
        </div>
      </div>

      {selectedCourse && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="space-y-2 p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <GraduationCap className="h-4 w-4 text-primary" />
              <span>Selected Course</span>
            </div>
            <div className="grid gap-2 text-sm sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Name</p>
                <p className="font-medium">{selectedCourse.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Fee</p>
                <p className="font-medium">
                  {selectedCourse.fee > 0
                    ? `${selectedCourse.fee.toLocaleString("en-US")} ${selectedCourse.currency || REG_DEFAULT_CURRENCY}`
                    : "Not set"}
                </p>
              </div>
              <div>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Sparkles className="h-3 w-3" />
                  Commission (10%)
                </p>
                <p className="font-medium text-primary">
                  {commissionPreview > 0
                    ? `${commissionPreview.toLocaleString("en-US")} ${selectedCourse.currency || REG_DEFAULT_CURRENCY}`
                    : "—"}
                </p>
              </div>
            </div>
            {selectedCourse.fee === 0 && (
              <p className="text-xs text-muted-foreground">
                ℹ️ This course has no fee set yet — commission will be zero
                until management defines a price.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-start gap-2">
        <Button
          type="submit"
          size="lg"
          disabled={isSubmitting || loadingCourses}
          className="min-w-[160px]"
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Register Student
        </Button>
      </div>
    </form>
  );
}

function makeIdempotencyKey(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  const rand2 = Math.random().toString(36).slice(2, 10);
  return `reg-${ts}-${rand}${rand2}`;
}
