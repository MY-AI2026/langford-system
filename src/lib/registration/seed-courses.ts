import { RegCourseCategory } from "@/lib/types";
import { REG_DEFAULT_CURRENCY } from "./constants";

/**
 * Seed payload for the Langford × Acceptix course catalogue.
 *
 * Pricing tiers per the current Langford agreement (Sep 2025):
 *
 *   Group:    English 140 KD   IELTS/TOEFL/ESP 160 KD   AI & Cyber 120 KD
 *   Private:  English 200 KD   IELTS/TOEFL/ESP 260 KD   AI & Cyber 250 KD
 *   Diplomas: Speak Smart 100 KD/month   PCD 450 KD
 *   Packages: IELTS (Course + Exam) 220 KD
 *
 * Each course is duplicated into Group + Private variants so the agent
 * picks the correct fee at registration time and the commission snapshot
 * is correct. ESP courses are marked Acceptix-exclusive per the contract.
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
    name: "Medical English (Group)",
    category: "esp",
    description: "English communication skills tailored for medical professionals — group sessions.",
    fee: 160,
    durationHours: null,
    durationLabel: "Group",
    isExclusiveAcceptix: true,
  },
  {
    name: "Medical English (Private)",
    category: "esp",
    description: "English communication skills tailored for medical professionals — one-on-one sessions.",
    fee: 260,
    durationHours: null,
    durationLabel: "Private",
    isExclusiveAcceptix: true,
  },
  {
    name: "Engineering English (Group)",
    category: "esp",
    description: "Technical English for engineering and construction fields — group sessions.",
    fee: 160,
    durationHours: null,
    durationLabel: "Group",
    isExclusiveAcceptix: true,
  },
  {
    name: "Engineering English (Private)",
    category: "esp",
    description: "Technical English for engineering and construction fields — one-on-one sessions.",
    fee: 260,
    durationHours: null,
    durationLabel: "Private",
    isExclusiveAcceptix: true,
  },
  {
    name: "Aviation English (Group)",
    category: "esp",
    description: "ICAO-aligned English for pilots, cabin crew, and ground staff — group sessions.",
    fee: 160,
    durationHours: null,
    durationLabel: "Group",
    isExclusiveAcceptix: true,
  },
  {
    name: "Aviation English (Private)",
    category: "esp",
    description: "ICAO-aligned English for pilots, cabin crew, and ground staff — one-on-one sessions.",
    fee: 260,
    durationHours: null,
    durationLabel: "Private",
    isExclusiveAcceptix: true,
  },
  {
    name: "Oil Industry English (Group)",
    category: "esp",
    description: "English for the oil & gas sector — operations, safety, and reporting. Group sessions.",
    fee: 160,
    durationHours: null,
    durationLabel: "Group",
    isExclusiveAcceptix: true,
  },
  {
    name: "Oil Industry English (Private)",
    category: "esp",
    description: "English for the oil & gas sector — operations, safety, and reporting. One-on-one sessions.",
    fee: 260,
    durationHours: null,
    durationLabel: "Private",
    isExclusiveAcceptix: true,
  },

  // ─── Exam Preparation ─────────────────────────────────────────────────────
  {
    name: "IELTS Preparation (Group)",
    category: "exam_prep",
    description: "Comprehensive IELTS prep covering all four modules — group sessions.",
    fee: 160,
    durationHours: null,
    durationLabel: "Group",
    isExclusiveAcceptix: false,
  },
  {
    name: "IELTS Preparation (Private)",
    category: "exam_prep",
    description: "Comprehensive IELTS prep covering all four modules — one-on-one sessions.",
    fee: 260,
    durationHours: null,
    durationLabel: "Private",
    isExclusiveAcceptix: false,
  },
  {
    name: "IELTS Package (Course + Exam)",
    category: "exam_prep",
    description: "IELTS preparation course bundled with the official exam fee.",
    fee: 220,
    durationHours: null,
    durationLabel: "Package",
    isExclusiveAcceptix: false,
  },
  {
    name: "TOEFL iBT (Group)",
    category: "exam_prep",
    description: "TOEFL iBT preparation — Reading, Listening, Speaking, Writing. Group sessions.",
    fee: 160,
    durationHours: null,
    durationLabel: "Group",
    isExclusiveAcceptix: false,
  },
  {
    name: "TOEFL iBT (Private)",
    category: "exam_prep",
    description: "TOEFL iBT preparation — one-on-one sessions.",
    fee: 260,
    durationHours: null,
    durationLabel: "Private",
    isExclusiveAcceptix: false,
  },
  {
    name: "TOEFL ITP (Group)",
    category: "exam_prep",
    description: "TOEFL ITP institutional test preparation — group sessions.",
    fee: 160,
    durationHours: null,
    durationLabel: "Group",
    isExclusiveAcceptix: false,
  },
  {
    name: "TOEFL ITP (Private)",
    category: "exam_prep",
    description: "TOEFL ITP institutional test preparation — one-on-one sessions.",
    fee: 260,
    durationHours: null,
    durationLabel: "Private",
    isExclusiveAcceptix: false,
  },
  {
    name: "Cambridge CPT (Group)",
    category: "exam_prep",
    description: "Cambridge Proficiency Test (CPT) preparation — group sessions.",
    fee: 160,
    durationHours: null,
    durationLabel: "Group",
    isExclusiveAcceptix: false,
  },
  {
    name: "Cambridge CPT (Private)",
    category: "exam_prep",
    description: "Cambridge Proficiency Test (CPT) preparation — one-on-one sessions.",
    fee: 260,
    durationHours: null,
    durationLabel: "Private",
    isExclusiveAcceptix: false,
  },
  {
    name: "Duolingo Test (Group)",
    category: "exam_prep",
    description: "Duolingo English Test preparation — group sessions.",
    fee: 160,
    durationHours: null,
    durationLabel: "Group",
    isExclusiveAcceptix: false,
  },
  {
    name: "Duolingo Test (Private)",
    category: "exam_prep",
    description: "Duolingo English Test preparation — one-on-one sessions.",
    fee: 260,
    durationHours: null,
    durationLabel: "Private",
    isExclusiveAcceptix: false,
  },

  // ─── Professional Courses ─────────────────────────────────────────────────
  {
    name: "General English (Group)",
    category: "professional",
    description: "General English language course — group sessions.",
    fee: 140,
    durationHours: null,
    durationLabel: "Group",
    isExclusiveAcceptix: false,
  },
  {
    name: "General English (Private)",
    category: "professional",
    description: "General English language course — one-on-one sessions.",
    fee: 200,
    durationHours: null,
    durationLabel: "Private",
    isExclusiveAcceptix: false,
  },
  {
    name: "Business English (Group)",
    category: "professional",
    description: "Business communication, meetings, presentations, and negotiations — group sessions.",
    fee: 140,
    durationHours: null,
    durationLabel: "Group",
    isExclusiveAcceptix: false,
  },
  {
    name: "Business English (Private)",
    category: "professional",
    description: "Business communication, meetings, presentations, and negotiations — one-on-one sessions.",
    fee: 200,
    durationHours: null,
    durationLabel: "Private",
    isExclusiveAcceptix: false,
  },
  {
    name: "Management (Group)",
    category: "professional",
    description: "Management fundamentals and leadership communication in English — group sessions.",
    fee: 140,
    durationHours: null,
    durationLabel: "Group",
    isExclusiveAcceptix: false,
  },
  {
    name: "IT English (Group)",
    category: "professional",
    description: "Technical English for IT professionals — group sessions.",
    fee: 140,
    durationHours: null,
    durationLabel: "Group",
    isExclusiveAcceptix: false,
  },
  {
    name: "Academic Writing (Group)",
    category: "professional",
    description: "Academic writing skills for higher education and research — group sessions.",
    fee: 140,
    durationHours: null,
    durationLabel: "Group",
    isExclusiveAcceptix: false,
  },
  {
    name: "AI Fundamentals (Group)",
    category: "professional",
    description: "Introduction to AI concepts and terminology in English — group sessions.",
    fee: 120,
    durationHours: null,
    durationLabel: "Group",
    isExclusiveAcceptix: false,
  },
  {
    name: "AI Fundamentals (Private)",
    category: "professional",
    description: "Introduction to AI concepts and terminology in English — one-on-one sessions.",
    fee: 250,
    durationHours: null,
    durationLabel: "Private",
    isExclusiveAcceptix: false,
  },
  {
    name: "Cybersecurity (Group)",
    category: "professional",
    description: "Cybersecurity fundamentals taught in English — group sessions.",
    fee: 120,
    durationHours: null,
    durationLabel: "Group",
    isExclusiveAcceptix: false,
  },
  {
    name: "Cybersecurity (Private)",
    category: "professional",
    description: "Cybersecurity fundamentals taught in English — one-on-one sessions.",
    fee: 250,
    durationHours: null,
    durationLabel: "Private",
    isExclusiveAcceptix: false,
  },

  // ─── Diplomas ─────────────────────────────────────────────────────────────
  {
    name: "Speak Smart Diploma",
    category: "diploma",
    description: "Six-month spoken English diploma. Billed at 100 KD/month (600 KD total over 6 months).",
    fee: 100,
    durationHours: null,
    durationLabel: "6 months · 100 KD/month",
    isExclusiveAcceptix: false,
  },
  {
    name: "PCD Diploma",
    category: "diploma",
    description: "Professional Communication Diploma — comprehensive diploma program.",
    fee: 450,
    durationHours: null,
    durationLabel: "Diploma",
    isExclusiveAcceptix: false,
  },
];

/** Shared default currency for seed entries. */
export const SEED_CURRENCY = REG_DEFAULT_CURRENCY;
