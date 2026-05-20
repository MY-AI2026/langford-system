import { Timestamp } from "firebase/firestore";

export type UserRole =
  | "admin"
  | "sales"
  | "instructor"
  | "coordinator"
  | "accountant"
  | "acceptix_agent";

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
  | "enrollment"
  | "schedule"
  | "summerClubStudent"
  | "summerClubPayment";

// ─── Schedule Types ───────────────────────────────────────────────────────────

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;
// 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat

export type DayPattern = "sat_mon_wed" | "sun_tue_thu" | "custom";

export interface ScheduleEntry {
  id: string;
  instructorId: string;
  instructorName: string;
  courseId: string | null;
  courseName: string;
  dayOfWeek: DayOfWeek;
  startTime: string;       // "HH:mm" 24-hour
  endTime: string;         // "HH:mm" 24-hour
  room: string;
  notes: string;
  dayPattern: DayPattern;
  patternGroupId: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ScheduleStudent {
  studentId: string;
  studentName: string;
  level: string | null;
  enrollmentId: string;
}

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

export type PaymentCategory = "main" | "ielts";

export interface IeltsSummary {
  totalPaid: number;
  paymentsCount: number;
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
  ieltsSummary?: IeltsSummary;
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
  category?: PaymentCategory; // "main" (default) or "ielts"
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

export interface EmbassyPayment {
  id: string;
  studentId: string;
  studentName: string;
  amount: number;
  paymentDate: Timestamp;
  notes?: string;
  createdBy: string;
  createdByName: string;
  createdAt: Timestamp;
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
  startDate?: Timestamp | null;
  endDate?: Timestamp | null;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Summer Club ─────────────────────────────────────────────────────────────

export type Gender = "male" | "female";

export interface SummerClubPaymentSummary {
  totalFees: number;
  amountPaid: number;
  remainingBalance: number;
  paymentStatus: PaymentStatus;
}

export interface SummerClubStudent {
  id: string;
  fullName: string;
  phone: string;
  gender: Gender;
  age?: number | null;
  guardianName?: string;
  guardianPhone?: string;
  notes?: string;
  isRegistered: boolean;
  registrationDate: Timestamp;
  assignedSalesRepId: string;
  assignedSalesRepName: string;
  paymentSummary: SummerClubPaymentSummary;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface SummerClubPayment {
  id: string;
  amount: number;
  paymentDate: Timestamp;
  method: PaymentMethod;
  receiptNumber: string;
  notes?: string;
  createdBy: string;
  createdByName: string;
  createdAt: Timestamp;
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

// ─── Registration Module (Acceptix Referral Portal) ──────────────────────────
//
// Self-contained module — collections prefixed `reg*`. Lives alongside the
// main app but isolation is enforced at the Firestore rules layer (see
// firestore.rules) and reinforced by service-level filters.
// Only `admin` and `acceptix_agent` roles interact with this module.

export type RegCourseCategory =
  | "esp"            // English for Specific Purposes (Medical, Engineering, Aviation, Oil...)
  | "exam_prep"      // IELTS, TOEFL, Cambridge, Duolingo
  | "professional"   // Business, Management, IT, AI, Cybersecurity, Academic Writing
  | "diploma"        // Speak Smart, BCD
  | "other";

export type RegStudentStatus = "new" | "enrolled" | "cancelled";

export type RegAuditAction =
  | "reg.course.create"
  | "reg.course.update"
  | "reg.course.delete"
  | "reg.student.create"
  | "reg.student.update"
  | "reg.student.delete"
  | "reg.student.restore"
  | "reg.agent.create"
  | "reg.agent.disable"
  | "reg.agent.enable"
  | "reg.agent.reset_password"
  | "reg.notification.read";

export type RegAuditEntityType =
  | "regCourse"
  | "regStudent"
  | "regAgent"
  | "regNotification";

export type RegNotificationType =
  | "new_student"
  | "agent_created"
  | "course_added";

export interface RegCourse {
  id: string;
  name: string;
  category: RegCourseCategory;
  description: string;
  fee: number;
  currency: string;
  /** Total contact hours (null when not applicable, e.g. exam preps). */
  durationHours: number | null;
  /** Human-readable duration, e.g. "3 months / 160 hours". */
  durationLabel: string;
  /** True if exclusive to Acceptix referrals (ESP catalog per the agreement). */
  isExclusiveAcceptix: boolean;
  isActive: boolean;
  createdBy: string;
  createdByName: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface RegStudent {
  id: string;

  // Identity
  fullName: string;
  phone: string;
  email: string | null;

  // Course — reference + snapshot (denormalized for historical accuracy on reports)
  courseId: string;
  courseName: string;
  courseCategory: RegCourseCategory;
  courseFee: number;
  currency: string;

  // Commission snapshot (locked at registration time so report figures are immutable)
  commissionRate: number;
  commissionAmount: number;

  // Source + creator (CRITICAL for isolation — Firestore rules enforce createdBy ownership)
  source: string;          // default "Acceptix"
  createdBy: string;       // agent's Firebase uid
  createdByName: string;
  createdByRole: UserRole;

  // Workflow (admin manages)
  status: RegStudentStatus;
  notes: string;

  // Soft delete — hard delete is disabled at the rules layer
  isDeleted: boolean;
  deletedAt: Timestamp | null;
  deletedBy: string | null;

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;

  /** Optional idempotency key to dedupe accidental double-submits. */
  idempotencyKey?: string;
}

export interface RegAuditLog {
  id: string;
  action: RegAuditAction;
  entityType: RegAuditEntityType;
  entityId: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  changes: Record<string, { from: unknown; to: unknown }>;
  /** Best-effort client diagnostics (may be null when not available). */
  userAgent: string | null;
  timestamp: Timestamp;
}

export interface RegNotification {
  id: string;
  type: RegNotificationType;

  /** Either a role-wide broadcast or a specific uid. */
  recipientRole: "admin" | UserRole;
  recipientUid: string | null;

  // Display
  title: string;
  body: string;
  link: string;

  // Source event
  entityType: RegAuditEntityType;
  entityId: string;

  // State
  isRead: boolean;
  readAt: Timestamp | null;
  readBy: string | null;

  // Email delivery (populated by Cloud Function in PR #4 — not used in PR #1)
  emailSent: boolean;
  emailSentAt: Timestamp | null;
  emailRecipients: string[];

  createdAt: Timestamp;
}
