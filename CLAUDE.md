@AGENTS.md

# 📍 أنا في: Langford / Main App (Next.js) — sub-project 01

> **الذاكرة الرئيسية:** اقرأ الأول `~/Desktop/مشاريعي/_system/CLAUDE.md`
> **الـ sub-project doc:** `~/Desktop/مشاريعي/01-Langford/sub-projects/01-main-app-nextjs.md`
> **قواعد عامة:** مصري فصيح دايماً، محافظ على الكود الموجود، PR فقط (مش push للـ main).

---

# Langford Student Management System

## Project Overview
Student management and sales tracking system for Langford International Institute in Kuwait.

## Tech Stack
- **Framework:** Next.js 16.2.1 (App Router, Turbopack)
- **Auth:** Firebase Authentication (Identity Toolkit REST API)
- **Database:** Firestore via REST API (no SDK — Vercel compatibility, avoids WebSocket)
- **UI:** Tailwind CSS + shadcn/ui components
- **Language:** TypeScript (strict)
- **Deployment:** Vercel (CLI: `npx vercel --prod --yes`)
- **Repo:** https://github.com/MY-AI2026/langford-system

## User Roles
| Role | Access |
|------|--------|
| **admin** | Full access — all pages, all actions |
| **sales** | Students, pipeline, payments — can add/edit |
| **instructor** | Dashboard, attendance, schedule (read-only schedule) |
| **coordinator** | Students, courses, schedule management |
| **accountant** | Students, payments, courses, student notes report — **view only** |

## Key Architecture Decisions
- **No Firestore SDK** — all Firestore ops via REST (`rest-helpers.ts`) to avoid WebSocket issues on Vercel
- **No collection group queries** — disabled due to missing indexes; use per-student subcollection queries instead
- **Client-side role enforcement** — `RoleGate` component + conditional UI rendering; Firestore rules allow all authenticated users
- **Composite index avoidance** — use simple single-field queries + client-side filtering

## Firestore Collections
| Collection | Description |
|------------|-------------|
| `users` | User accounts and roles |
| `students` | Student records |
| `students/{id}/payments` | Payment subcollection |
| `students/{id}/activityLog` | Notes, follow-ups, status changes |
| `students/{id}/enrollments` | Course enrollments |
| `students/{id}/installmentPlans` | Payment plans |
| `students/{id}/attendance` | Attendance records |
| `courses` | Course definitions |
| `schedules` | Instructor weekly schedule entries |
| `loginLogs` | Login audit trail |
| `auditLog` | System audit log |

## Important Files
- `src/lib/firebase/rest-helpers.ts` — Core Firestore REST operations (restCreate, restUpdate, restDelete, runQuery, fetchCollection)
- `src/lib/types/index.ts` — All TypeScript types and interfaces
- `src/components/auth/role-gate.tsx` — Role-based page protection
- `src/contexts/auth-context.tsx` — Auth state management
- `src/lib/services/` — Service layer for each domain (student, enrollment, schedule, etc.)
- `firestore.rules` — Firestore security rules (must be updated when adding new collections)
- `firestore.indexes.json` — Firestore composite indexes

## Deployment Checklist
1. Build: `export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH" && npx next build`
2. Push: `git push origin main` (may need token in URL for auth)
3. Deploy: `npx vercel --prod --yes`
4. If new Firestore collection added: `npx firebase deploy --only firestore:rules`

## Recent Changes (2026-04-28)
- Re-enabled **`useFollowupCount` sidebar badge** — collection group query on `activityLog` with field override on `isFollowUpDone`, polling 30s
- Added `*.pdf` to `.gitignore` (sales/training drafts kept out of repo)
- Prevent **duplicate phone numbers** across students (Arabic error message)
- **Course → instructor assignment** so attendance lists students for the assigned instructor
- Added **embassy transfer tracking** + separate **IELTS exam bookings card** on dashboard
- Added Firestore collection-group field overrides for `enrollments` (`courseId`, `instructorId`, `status`)
- Dashboard charts + follow-ups + coordinator view enhancements

### Earlier (2026-04-12)
- Added **accountant** role (read-only access to students, payments, courses)
- Added **student notes report** (`/reports/student-notes`) — admin + accountant, with CSV export
- Added **weekly teacher schedule** (`/schedule`) — admin, coordinator, instructor
- Fixed Firestore queries to avoid composite index requirements (client-side filtering)
- Added `schedules` collection to Firestore security rules
- Added **delete enrollment** (Remove button) for admin in enrollment tab
- Rewrote `fetchStudentsForCourse` to use **collection group query** on enrollments (fast single query instead of per-student iteration)
- Added `enrollments` collection group rule to Firestore security rules
- **Collection group queries ARE supported** for: activityLog, payments, enrollments (rules + auto indexes)
