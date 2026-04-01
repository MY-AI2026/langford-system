"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { evaluationSchema, EvaluationFormData } from "@/lib/utils/validators";
import { DEFAULT_LEVELS } from "@/lib/utils/constants";
import { Evaluation } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";

interface EvaluationFormProps {
  defaultValues?: Evaluation;
  onSubmit: (data: EvaluationFormData) => Promise<void>;
}

export function EvaluationForm({
  defaultValues,
  onSubmit,
}: EvaluationFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EvaluationFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(evaluationSchema) as any,
    defaultValues: {
      placementTestScore: defaultValues?.placementTestScore ?? null,
      interviewStatus: defaultValues?.interviewStatus || "not_completed",
      interviewNotes: defaultValues?.interviewNotes || "",
      finalLevel: defaultValues?.finalLevel || null,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="placementTestScore">Placement Test Score</Label>
          <Input
            id="placementTestScore"
            type="number"
            min={0}
            max={100}
            placeholder="0 - 100"
            {...register("placementTestScore")}
          />
          {errors.placementTestScore && (
            <p className="text-sm text-destructive">
              {errors.placementTestScore.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Final Level</Label>
          <Select
            value={watch("finalLevel") || ""}
            onValueChange={(val) => setValue("finalLevel", val || null)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select level" />
            </SelectTrigger>
            <SelectContent>
              {DEFAULT_LEVELS.map((level) => (
                <SelectItem key={level} value={level}>
                  {level}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3 sm:col-span-2">
          <Switch
            checked={watch("interviewStatus") === "completed"}
            onCheckedChange={(checked) =>
              setValue(
                "interviewStatus",
                checked ? "completed" : "not_completed"
              )
            }
          />
          <Label>Interview Completed</Label>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="interviewNotes">Interview Notes</Label>
          <Textarea
            id="interviewNotes"
            placeholder="Notes from the interview..."
            rows={4}
            {...register("interviewNotes")}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Evaluation
        </Button>
      </div>
    </form>
  );
}
