import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email"),
});

export const studentSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().min(8, "Please enter a valid phone number"),
  email: z.string().email("Please enter a valid email").optional().or(z.literal("")),
  civilId: z.string().optional(),
  leadSource: z.string().min(1, "Please select a lead source"),
  assignedSalesRepId: z.string().min(1, "Please select a sales representative"),
  interestedCourse: z.string().optional(),
});

export const evaluationSchema = z.object({
  placementTestScore: z.coerce.number().min(0).max(100).nullable(),
  interviewStatus: z.enum(["not_completed", "completed"]),
  interviewNotes: z.string().optional().default(""),
  finalLevel: z.string().nullable(),
});

export const paymentSchema = z.object({
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  method: z.enum(["cash", "card", "bank_transfer", "online"]),
  paymentDate: z.date(),
  notes: z.string().optional().default(""),
  courseId: z.string().optional(),
  courseName: z.string().optional(),
});

export const installmentPlanSchema = z.object({
  totalFees: z.coerce.number().positive("Total fees must be greater than 0"),
  numberOfInstallments: z.coerce
    .number()
    .int()
    .min(2, "Must have at least 2 installments")
    .max(12, "Maximum 12 installments"),
  startDate: z.date(),
});

export const userSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  displayName: z.string().min(2, "Name must be at least 2 characters"),
  role: z.enum(["admin", "sales", "instructor", "coordinator", "accountant"]),
  phone: z.string(),
  monthlyTarget: z.number().min(0),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const noteSchema = z.object({
  type: z.enum(["note", "follow_up"]),
  description: z.string().min(1, "Please enter a note"),
  followUpDate: z.date().nullable().optional(),
});

export const settingsSchema = z.object({
  instituteName: z.string().min(1, "Institute name is required"),
  institutePhone: z.string().optional().default(""),
  instituteAddress: z.string().optional().default(""),
  defaultCurrency: z.string().min(1, "Currency is required"),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type StudentFormData = z.infer<typeof studentSchema>;
export type EvaluationFormData = z.infer<typeof evaluationSchema>;
export type PaymentFormData = z.infer<typeof paymentSchema>;
export type InstallmentPlanFormData = z.infer<typeof installmentPlanSchema>;
export type UserFormData = z.infer<typeof userSchema>;
export type NoteFormData = z.infer<typeof noteSchema>;
export type SettingsFormData = z.infer<typeof settingsSchema>;
