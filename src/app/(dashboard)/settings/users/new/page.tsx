"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { RoleGate } from "@/components/auth/role-gate";
import { PageHeader } from "@/components/layout/page-header";
import { createUser } from "@/lib/services/user-service";
import { userSchema, UserFormData } from "@/lib/utils/validators";
import { Card, CardContent } from "@/components/ui/card";
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
import { toast } from "sonner";

export default function NewUserPage() {
  return (
    <RoleGate allowedRoles={["admin"]}>
      <NewUserContent />
    </RoleGate>
  );
}

function NewUserContent() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UserFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(userSchema) as any,
    defaultValues: {
      email: "",
      displayName: "",
      role: "sales",
      phone: "",
      monthlyTarget: 0,
      password: "",
    },
  });

  async function onSubmit(data: UserFormData) {
    setIsLoading(true);
    try {
      await createUser({
        email: data.email,
        password: data.password,
        displayName: data.displayName,
        role: data.role,
        phone: data.phone,
        monthlyTarget: data.monthlyTarget,
      });
      toast.success("User created successfully");
      router.push("/settings/users");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to create user";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Add New User" />
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="displayName">Full Name *</Label>
                <Input id="displayName" {...register("displayName")} />
                {errors.displayName && (
                  <p className="text-sm text-destructive">
                    {errors.displayName.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" {...register("email")} />
                {errors.email && (
                  <p className="text-sm text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  {...register("password")}
                />
                {errors.password && (
                  <p className="text-sm text-destructive">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Role *</Label>
                <Select
                  value={watch("role")}
                  onValueChange={(val) =>
                    setValue("role", val as "admin" | "sales" | "instructor" | "coordinator")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="coordinator">Administrative Coordinator</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="instructor">Instructor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" {...register("phone")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="monthlyTarget">Monthly Target (KWD)</Label>
                <Input
                  id="monthlyTarget"
                  type="number"
                  step="0.001"
                  {...register("monthlyTarget")}
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={isLoading}>
                {isLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create User
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
