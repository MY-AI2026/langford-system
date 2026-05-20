import { RegCourseCategory } from "@/lib/types";
import { REG_DEFAULT_CURRENCY } from "./constants";

/**
 * Seed payload for the initial Langford × Acceptix course catalogue.
 *
 * Sourced from the Langford × Acceptix agreement. ESP entries are flagged
 * `isExclusiveAcceptix: true` per the contract — the catalogue is a starting
 * set; the admin can extend it from the UI (the agreement references 60+ ESP
 * courses in total).
 *
 * Fees marked `null` are placeholders for items where the agreement does not
 * fix a price yet — the admin must set the fee from the UI before any
 * commission can be computed.
 */
export interface SeedCourse {
  name: string;
  category: RegCourseCategory;
  description: string;
  fee: number | null;
  durationHours: number | null;
  durationLabel: string;
  isExclusiveAcceptix: boolean;
}

export const SEED_COURSES: SeedCourse[] = [
  // ─── ESP — English for Specific Purposes (Acceptix-exclusive) ─────────────
  {
    name: "Medical English",
    category: "esp",
    description: "English communication skills tailored for medical professionals.",
    fee: null,
    durationHours: null,
    durationLabel: "Flexible",
    isExclusiveAcceptix: true,
  },
  {
    name: "Engineering English",
    category: "esp",
    description: "Technical English for engineering and construction fields.",
    fee: null,
    durationHours: null,
    durationLabel: "Flexible",
    isExclusiveAcceptix: true,
  },
  {
    name: "Aviation English",
    category: "esp",
    description: "ICAO-aligned English for pilots, cabin crew, and ground staff.",
    fee: null,
    durationHours: null,
    durationLabel: "Flexible",
    isExclusiveAcceptix: true,
  },
  {
    name: "Oil Industry English",
    category: "esp",
    description: "English for the oil & gas sector — operations, safety, and reporting.",
    fee: null,
    durationHours: null,
    durationLabel: "Flexible",
    isExclusiveAcceptix: true,
  },

  // ─── Exam Preparation ─────────────────────────────────────────────────────
  {
    name: "IELTS Preparation — Regular",
    category: "exam_prep",
    description: "Comprehensive IELTS prep covering all four modules at a standard pace.",
    fee: null,
    durationHours: null,
    durationLabel: "Regular",
    isExclusiveAcceptix: false,
  },
  {
    name: "IELTS Preparation — Intensive",
    category: "exam_prep",
    description: "Accelerated IELTS prep with extended weekly hours.",
    fee: null,
    durationHours: null,
    durationLabel: "Intensive",
    isExclusiveAcceptix: false,
  },
  {
    name: "TOEFL iBT — Regular",
    category: "exam_prep",
    description: "TOEFL iBT preparation — Reading, Listening, Speaking, Writing.",
    fee: null,
    durationHours: null,
    durationLabel: "Regular",
    isExclusiveAcceptix: false,
  },
  {
    name: "TOEFL iBT — Intensive",
    category: "exam_prep",
    description: "Accelerated TOEFL iBT preparation.",
    fee: null,
    durationHours: null,
    durationLabel: "Intensive",
    isExclusiveAcceptix: false,
  },
  {
    name: "TOEFL ITP — Regular",
    category: "exam_prep",
    description: "TOEFL ITP institutional test preparation.",
    fee: null,
    durationHours: null,
    durationLabel: "Regular",
    isExclusiveAcceptix: false,
  },
  {
    name: "TOEFL ITP — Intensive",
    category: "exam_prep",
    description: "Accelerated TOEFL ITP preparation.",
    fee: null,
    durationHours: null,
    durationLabel: "Intensive",
    isExclusiveAcceptix: false,
  },
  {
    name: "Cambridge CPT — Intensive",
    category: "exam_prep",
    description: "Cambridge Proficiency Test (CPT) intensive preparation.",
    fee: null,
    durationHours: null,
    durationLabel: "Intensive",
    isExclusiveAcceptix: false,
  },
  {
    name: "Duolingo Test — Regular",
    category: "exam_prep",
    description: "Duolingo English Test preparation at a regular pace.",
    fee: null,
    durationHours: null,
    durationLabel: "Regular",
    isExclusiveAcceptix: false,
  },
  {
    name: "Duolingo Test — Intensive",
    category: "exam_prep",
    description: "Accelerated Duolingo English Test preparation.",
    fee: null,
    durationHours: null,
    durationLabel: "Intensive",
    isExclusiveAcceptix: false,
  },

  // ─── Professional Courses ─────────────────────────────────────────────────
  {
    name: "Business English",
    category: "professional",
    description: "Business communication, meetings, presentations, and negotiations.",
    fee: null,
    durationHours: null,
    durationLabel: "Flexible",
    isExclusiveAcceptix: false,
  },
  {
    name: "Management",
    category: "professional",
    description: "Management fundamentals and leadership communication in English.",
    fee: null,
    durationHours: null,
    durationLabel: "Flexible",
    isExclusiveAcceptix: false,
  },
  {
    name: "IT English",
    category: "professional",
    description: "Technical English for IT professionals.",
    fee: null,
    durationHours: null,
    durationLabel: "Flexible",
    isExclusiveAcceptix: false,
  },
  {
    name: "AI Fundamentals",
    category: "professional",
    description: "Introduction to AI concepts and terminology in English.",
    fee: null,
    durationHours: null,
    durationLabel: "Flexible",
    isExclusiveAcceptix: false,
  },
  {
    name: "Cybersecurity",
    category: "professional",
    description: "Cybersecurity fundamentals taught in English.",
    fee: null,
    durationHours: null,
    durationLabel: "Flexible",
    isExclusiveAcceptix: false,
  },
  {
    name: "Academic Writing Course",
    category: "professional",
    description: "Academic writing skills for higher education and research.",
    fee: null,
    durationHours: null,
    durationLabel: "Flexible",
    isExclusiveAcceptix: false,
  },

  // ─── Diplomas ─────────────────────────────────────────────────────────────
  {
    name: "Speak Smart Diploma",
    category: "diploma",
    description: "Six-month spoken English diploma program.",
    fee: null,
    durationHours: null,
    durationLabel: "6 months",
    isExclusiveAcceptix: false,
  },
  {
    name: "BCD Diploma",
    category: "diploma",
    description:
      "Business Communication Diploma — 5 modules / 160 hours across 3 months.",
    fee: 300,
    durationHours: 160,
    durationLabel: "3 months / 160 hours / 5 modules",
    isExclusiveAcceptix: false,
  },
];

/** Shared default currency for seed entries. */
export const SEED_CURRENCY = REG_DEFAULT_CURRENCY;
