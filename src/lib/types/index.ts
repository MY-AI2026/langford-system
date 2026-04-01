import { Timestamp } from "firebase/firestore";

export type UserRole = "admin" | "sales" | "instructor" | "coordinator";

export type StudentStatus =
  | "lead"
  | "contacted"
  | "evaluated"
  | "enrolled"
  | "paid"
  | "lost";

export type InterviewStatus = "not_completed" | "completed";

export type PaymentStatus = "pending" | "partial" | "paid";

export type PaymentMethod = "cash" | "card" | "bank_transfer" | "online";

export type ActivityLogType =
  | "note"
  | "follow_up"
  | "status_change"
  | "payment"
  | "evaluation"
  | "edit";

export type CourseCategory = "general_english" | "exam_prep" | "professional" | "diploma" | "other";

export type EnrollmentStatus = "active" | "completed" | "dropped" | "on_hold";

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "archive"
  | "restore"
  | "login"
  | "payment";

export type EntityType =
  | "student"
  | "payment"
  | "user"
  | "installmentPlan"
  | "enrollment";

export type InstallmentStatus = "pending" | "paid" | "overdue";

export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  phone?: string;
  monthlyTarget: number;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Evaluation {
  placementTestScore: number | null;
  interviewStatus: InterviewStatus;
  interviewNotes: string;
  finalLevel: string | null;
  evaluatedAt: Timestamp | null;
  evaluatedBy: string | null;
}

export interface PaymentSummary {
  totalFees: number;
  amountPaid: number;
  remainingBalance: number;
  paymentStatus: PaymentStatus;
  hasOverdue: boolean;
}

export interface Student {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  civilId?: string;  // Kuwait Civil ID — optional
  leadSource: string;
  registrationDate: Timestamp;
  assignedSalesRepId: string;
  assignedSalesRepName: string;
  status: StudentStatus;
  lostReason?: string;
  isArchived: boolean;
  archivedAt: Timestamp | null;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  interestedCourse?: string;
  evaluation: Evaluation;
  paymentSummary: PaymentSummary;
}

export interface ActivityLogEntry {
  id: string;
  type: ActivityLogType;
  description: string;
  previousValue?: unknown;
  newValue?: unknown;
  createdBy: string;
  createdByName: string;
  createdAt: Timestamp;
  followUpDate: Timestamp | null;
  isFollowUpDone: boolean;
}

export interface Payment {
  id: string;
  amount: number;
  paymentDate: Timestamp;
  method: PaymentMethod;
  receiptNumber: string;
  notes?: string;
  isInstallment: boolean;
  installmentNumber: number | null;
  courseId?: string;
  courseName?: string;
  createdBy: string;
  createdAt: Timestamp;
}

export interface InstallmentItem {
  installmentNumber: number;
  amount: number;
  dueDate: Timestamp;
  status: InstallmentStatus;
  paidDate: Timestamp | null;
  paymentId: string | null;
}

export interface InstallmentPlan {
  id: string;
  studentId: string;
  totalFees: number;
  numberOfInstallments: number;
  installments: InstallmentItem[];
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AuditLogEntry {
  id: string;
  action: AuditAction;
  entityType: EntityType;
  entityId: string;
  userId: string;
  userName: string;
  changes: Record<string, { from: unknown; to: unknown }>;
  timestamp: Timestamp;
}

export interface SystemSettings {
  leadSources: string[];
  levels: string[];
  paymentMethods: string[];
  defaultCurrency: string;
  instituteName: string;
  institutePhone: string;
  instituteAddress: string;
}

export interface Course {
  id: string;
  name: string;
  description: string;
  category: CourseCategory;
  duration: string;
  level: string;
  defaultFees: number;
  maxStudents: number;
  instructorId?: string;
  instructorName?: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Enrollment {
  id: string;
  studentId: string;
  courseId: string;
  courseName: string;
  courseCategory: CourseCategory;
  level?: string;
  startDate: Timestamp;
  endDate?: Timestamp | null;
  status: EnrollmentStatus;
  fees: number;
  amountPaid: number;
  remainingBalance: number;
  instructorId?: string;
  instructorName?: string;
  notes?: string;
  completionCertificateGenerated?: boolean;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
