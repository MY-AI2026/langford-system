import { z } from "zod";
import { normalizePhone } from "./phone";

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email"),
});

export const studentSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  phone: z
    .string()
    .refine(
      (val) => normalizePhone(val).length >= 7,
      "رقم التليفون مش صحيح — لازم يكون 7 أرقام على الأقل"
    ),
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
  role: z.enum([
    "admin",
    "sales",
    "instructor",
    "coordinator",
    "accountant",
    "acceptix_agent",
    "academic_organizer",
  ]),
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

// ─── Registration Module (Acceptix Referral Portal) ──────────────────────────

const REG_CATEGORIES = ["esp", "exam_prep", "professional", "diploma", "other"] as const;
const REG_STATUSES = ["new", "enrolled", "cancelled"] as const;

/** Strong password — enforced on every new Acceptix-agent account. */
export const regStrongPasswordSchema = z
  .string()
  .min(12, "كلمة المرور لازم تكون 12 حرف على الأقل")
  .refine((v) => /[A-Z]/.test(v), "لازم يكون فيها حرف كبير (A-Z)")
  .refine((v) => /[a-z]/.test(v), "لازم يكون فيها حرف صغير (a-z)")
  .refine((v) => /\d/.test(v), "لازم يكون فيها رقم (0-9)")
  .refine((v) => /[^A-Za-z0-9]/.test(v), "لازم يكون فيها رمز خاص (!@#$...)");

/** Course (admin-managed). */
export const regCourseSchema = z.object({
  name: z.string().min(2, "اسم الكورس لازم يكون حرفين على الأقل"),
  category: z.enum(REG_CATEGORIES),
  description: z.string().optional(),
  // No `.coerce` — RHF's `valueAsNumber: true` does the conversion at the
  // form layer, and chaining `.coerce` here makes Zod's input type widen
  // to `unknown`, which breaks the @hookform/resolvers/zod handshake.
  fee: z.number().nonnegative("الرسوم لازم تكون 0 أو أكتر").optional(),
  currency: z.string().min(2).optional(),
  durationHours: z.number().int().nonnegative().nullable().optional(),
  durationLabel: z.string().optional(),
  isExclusiveAcceptix: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

/** Student registration (agent-submitted). */
export const regStudentSchema = z.object({
  fullName: z.string().min(2, "اسم الطالب لازم يكون حرفين على الأقل"),
  phone: z
    .string()
    .refine(
      (val) => normalizePhone(val).length >= 7,
      "رقم التليفون مش صحيح — لازم يكون 7 أرقام على الأقل"
    ),
  email: z.string().email("الإيميل مش صحيح").optional().or(z.literal("")),
  courseId: z.string().min(1, "اختر الكورس"),
  // `.default("")` would create an input/output type mismatch under the
  // current Zod + RHF resolver pairing; we set the empty default at the
  // form layer via `useForm({ defaultValues })` instead.
  notes: z.string().optional(),
});

/** Admin-side update (status + notes only — identity fields are immutable post-create). */
export const regStudentUpdateSchema = z.object({
  status: z.enum(REG_STATUSES),
  notes: z.string().optional(),
});

/** Create a new Acceptix agent (admin action). */
export const regAgentCreateSchema = z.object({
  fullName: z.string().min(2, "الاسم لازم يكون حرفين على الأقل"),
  email: z.string().email("الإيميل مش صحيح"),
  phone: z.string().optional(),
  password: regStrongPasswordSchema,
});

/** Reset an agent's password. */
export const regAgentResetPasswordSchema = z.object({
  password: regStrongPasswordSchema,
});

export type RegCourseFormData = z.infer<typeof regCourseSchema>;
export type RegStudentFormData = z.infer<typeof regStudentSchema>;
export type RegStudentUpdateFormData = z.infer<typeof regStudentUpdateSchema>;
export type RegAgentCreateFormData = z.infer<typeof regAgentCreateSchema>;
export type RegAgentResetPasswordFormData = z.infer<typeof regAgentResetPasswordSchema>;

export type LoginFormData = z.infer<typeof loginSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type StudentFormData = z.infer<typeof studentSchema>;
export type EvaluationFormData = z.infer<typeof evaluationSchema>;
export type PaymentFormData = z.infer<typeof paymentSchema>;
export type InstallmentPlanFormData = z.infer<typeof installmentPlanSchema>;
export type UserFormData = z.infer<typeof userSchema>;
export type NoteFormData = z.infer<typeof noteSchema>;
export type SettingsFormData = z.infer<typeof settingsSchema>;
