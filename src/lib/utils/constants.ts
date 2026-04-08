import { StudentStatus, PaymentStatus, InterviewStatus, PaymentMethod, ActivityLogType, CourseCategory, EnrollmentStatus } from "@/lib/types";

export const STUDENT_STATUS_CONFIG: Record<
  StudentStatus,
  { label: string; color: string; bgColor: string }
> = {
  lead: { label: "Lead", color: "text-gray-700", bgColor: "bg-gray-100" },
  contacted: { label: "Contacted", color: "text-blue-700", bgColor: "bg-blue-100" },
  evaluated: { label: "Evaluated", color: "text-yellow-700", bgColor: "bg-yellow-100" },
  enrolled: { label: "Enrolled", color: "text-green-700", bgColor: "bg-green-100" },
  paid: { label: "Paid", color: "text-emerald-700", bgColor: "bg-emerald-100" },
  lost: { label: "Lost", color: "text-red-700", bgColor: "bg-red-100" },
};

export const STUDENT_STATUSES: StudentStatus[] = [
  "lead",
  "contacted",
  "evaluated",
  "enrolled",
  "paid",
  "lost",
];

export const PIPELINE_STATUSES: StudentStatus[] = [
  "lead",
  "contacted",
  "evaluated",
  "enrolled",
  "paid",
];

export const PAYMENT_STATUS_CONFIG: Record<
  PaymentStatus,
  { label: string; color: string; bgColor: string }
> = {
  pending: { label: "Pending", color: "text-yellow-700", bgColor: "bg-yellow-100" },
  partial: { label: "Partial", color: "text-orange-700", bgColor: "bg-orange-100" },
  paid: { label: "Paid", color: "text-green-700", bgColor: "bg-green-100" },
};

export const INTERVIEW_STATUS_CONFIG: Record<
  InterviewStatus,
  { label: string }
> = {
  not_completed: { label: "Not Completed" },
  completed: { label: "Completed" },
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  card: "Card",
  bank_transfer: "Bank Transfer",
  online: "Online",
};

export const ACTIVITY_TYPE_CONFIG: Record<
  ActivityLogType,
  { label: string; icon: string }
> = {
  note: { label: "Note", icon: "MessageSquare" },
  follow_up: { label: "Follow-up", icon: "Clock" },
  status_change: { label: "Status Change", icon: "ArrowRightLeft" },
  payment: { label: "Payment", icon: "CreditCard" },
  evaluation: { label: "Evaluation", icon: "ClipboardCheck" },
  edit: { label: "Edit", icon: "Pencil" },
};

export const DEFAULT_LEAD_SOURCES = [
  "Walk-in",
  "Phone Inquiry",
  "Social Media",
  "Website",
  "Referral",
  "Sponsor",
  "Exhibition",
  "Other",
];

export const DEFAULT_LEVELS = [
  "Starter 1",
  "Starter 2",
  "Elementary 1",
  "Elementary 2",
  "Pre-Intermediate 1",
  "Pre-Intermediate 2",
  "Intermediate 1",
  "Intermediate 2",
  "Upper-Intermediate 1",
  "Upper-Intermediate 2",
  "Advanced 1",
  "Advanced 2",
];

export const DEFAULT_CURRENCY = "KWD";

export const IELTS_EXAM_FEE = 96;

export const COURSE_CATEGORIES: Record<CourseCategory, { label: string; labelAr: string }> = {
  general_english: { label: "General English", labelAr: "إنجليزي عام" },
  exam_prep: { label: "Exam Preparation", labelAr: "تحضير اختبارات" },
  professional: { label: "Professional", labelAr: "مهني" },
  diploma: { label: "Diploma", labelAr: "دبلوم" },
  other: { label: "Other", labelAr: "أخرى" },
};

export const ENROLLMENT_STATUS_CONFIG: Record<EnrollmentStatus, { label: string; color: string; bgColor: string }> = {
  active: { label: "Active", color: "text-green-700", bgColor: "bg-green-50" },
  completed: { label: "Completed", color: "text-blue-700", bgColor: "bg-blue-50" },
  dropped: { label: "Dropped", color: "text-red-700", bgColor: "bg-red-50" },
  on_hold: { label: "On Hold", color: "text-yellow-700", bgColor: "bg-yellow-50" },
};
