"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { noteSchema, NoteFormData } from "@/lib/utils/validators";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface AddNoteFormProps {
  onSubmit: (data: NoteFormData) => Promise<void>;
}

export function AddNoteForm({ onSubmit }: AddNoteFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NoteFormData>({
    resolver: zodResolver(noteSchema),
    defaultValues: {
      type: "note",
      description: "",
      followUpDate: null,
    },
  });

  const noteType = watch("type");

  async function handleFormSubmit(data: NoteFormData) {
    await onSubmit(data);
    reset();
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-3">
      <div className="flex gap-3">
        <div className="space-y-1">
          <Select
            value={noteType}
            onValueChange={(val) =>
              setValue("type", val as "note" | "follow_up")
            }
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="note">Note</SelectItem>
              <SelectItem value="follow_up">Follow-up</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {noteType === "follow_up" && (
          <div className="space-y-1">
            <Input
              type="date"
              {...register("followUpDate", { valueAsDate: true })}
            />
          </div>
        )}
      </div>

      <Textarea
        placeholder={
          noteType === "follow_up"
            ? "What needs to be followed up?"
            : "Add a note..."
        }
        {...register("description")}
      />
      {errors.description && (
        <p className="text-sm text-destructive">{errors.description.message}</p>
      )}

      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Add {noteType === "follow_up" ? "Follow-up" : "Note"}
        </Button>
      </div>
    </form>
  );
}
