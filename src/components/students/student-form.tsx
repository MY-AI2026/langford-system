"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { studentSchema, StudentFormData } from "@/lib/utils/validators";
import { useSystemSettings } from "@/hooks/use-system-settings";
import { getSalesUsers } from "@/lib/services/user-service";
import { subscribeToCourses } from "@/lib/services/course-service";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";
import { User, Course } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface StudentFormProps {
  defaultValues?: Partial<StudentFormData>;
  onSubmit: (data: StudentFormData) => Promise<void>;
  submitLabel?: string;
}

export function StudentForm({
  defaultValues,
  onSubmit,
  submitLabel,
}: StudentFormProps) {
  const { role, firebaseUser, userData } = useAuth();
  const { t } = useLanguage();
  const { settings } = useSystemSettings();
  const [salesUsers, setSalesUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      email: "",
      civilId: "",
      leadSource: "",
      assignedSalesRepId: role === "sales" ? firebaseUser?.uid || "" : "",
      interestedCourse: "",
      ...defaultValues,
    },
  });

  useEffect(() => {
    async function loadSalesUsers() {
      const users = await getSalesUsers();
      setSalesUsers(users);
      // Auto-assign for sales role
      if (role === "sales" && firebaseUser && !defaultValues?.assignedSalesRepId) {
        setValue("assignedSalesRepId", firebaseUser.uid);
      }
    }
    loadSalesUsers();
  }, [role, firebaseUser, defaultValues, setValue]);

  useEffect(() => {
    const unsub = subscribeToCourses((data) => {
      setCourses(data.filter((c) => c.isActive));
    });
    return () => unsub();
  }, []);

  async function handleFormSubmit(data: StudentFormData) {
    setIsLoading(true);
    try {
      await onSubmit(data);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="fullName">{t("fullName")} *</Label>
          <Input
            id="fullName"
            placeholder={t("studentFullNamePlaceholder")}
            {...register("fullName")}
          />
          {errors.fullName && (
            <p className="text-sm text-destructive">{errors.fullName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">{t("phone")} *</Label>
          <Input
            id="phone"
            placeholder="e.g., 9XXXXXXX"
            {...register("phone")}
          />
          {errors.phone && (
            <p className="text-sm text-destructive">{errors.phone.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="civilId">Civil ID (الرقم المدني)</Label>
          <Input
            id="civilId"
            placeholder="e.g., 123456789012"
            {...register("civilId")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">{t("email")}</Label>
          <Input
            id="email"
            type="email"
            placeholder="student@email.com"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>{t("leadSource")} *</Label>
          <Select
            value={watch("leadSource")}
            onValueChange={(val) => setValue("leadSource", val ?? "")}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("selectLeadSource")} />
            </SelectTrigger>
            <SelectContent>
              {settings.leadSources.map((source) => (
                <SelectItem key={source} value={source}>
                  {source}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.leadSource && (
            <p className="text-sm text-destructive">{errors.leadSource.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>{t("interestedCourse")}</Label>
          <Select
            value={watch("interestedCourse") || ""}
            onValueChange={(val) => { if (val) setValue("interestedCourse", val); }}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("selectCourseInterest")} />
            </SelectTrigger>
            <SelectContent>
              {courses.map((course) => (
                <SelectItem key={course.id} value={course.name}>
                  {course.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label>{t("assignedSalesRep")} *</Label>
          <Select
            value={watch("assignedSalesRepId")}
            onValueChange={(val) => setValue("assignedSalesRepId", val ?? "")}
            disabled={role === "sales"}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("selectSalesRep")} />
            </SelectTrigger>
            <SelectContent>
              {salesUsers.map((user) => (
                <SelectItem key={user.uid} value={user.uid}>
                  {user.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.assignedSalesRepId && (
            <p className="text-sm text-destructive">
              {errors.assignedSalesRepId.message}
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit" disabled={isSubmitting || isLoading}>
          {(isSubmitting || isLoading) && (
            <Loader2 className="me-2 h-4 w-4 animate-spin" />
          )}
          {submitLabel ?? t("saveStudent")}
        </Button>
      </div>
    </form>
  );
}
