# Langford × Acceptix — Registration Module

> Status: **PR #1 (Foundation)** — schema, types, Firestore rules, services, route group scaffold. No UI yet — that lands in PR #2.

## Purpose

A self-contained portal where Acceptix's referral agents register prospective students into Langford courses, and the Langford admin manages those registrations end-to-end (review, status, reporting, commission).

There is **no self-service**: agents always log in. Each agent is **isolated** — they only ever see registrations they personally created.

## Roles

| Role | Source | Surface |
|------|--------|---------|
| `admin` | Existing Langford role | Full module access — agents, courses, all students, reports, settings |
| `acceptix_agent` | **New** (added in this PR) | Register a student + view "my students" only |

Anyone with a different role (`sales`, `instructor`, `coordinator`, `accountant`) is redirected away from `/registration` back to the main dashboard — the registration module is invisible to them.

## Collections (Firestore)

All collections are prefixed `reg*` to keep them visually separate from the main app schema. None of the existing main-app collections are touched.

| Collection | Owner | Description |
|------------|-------|-------------|
| `regCourses` | admin writes | Course catalogue. Includes fee snapshot, currency, duration, and the Acceptix-exclusive flag. |
| `regStudents` | agent creates (own), admin manages | Student registrations. Every row is creator-bound via `createdBy`. Snapshot fields (`courseFee`, `commissionRate`, `commissionAmount`, `currency`) lock historical accuracy. |
| `regAuditLog` | append-only | Every write action gets a row. Immutable — even admins cannot mutate or delete entries. |
| `regNotifications` | inbox | In-app alerts for the admin. Email delivery (Resend via Cloud Function) lands in PR #4. |

## Security model

Defense-in-depth, enforced at three layers:

1. **Firestore Security Rules** (`firestore.rules`) — the source of truth.
   - Reads & writes look up the requesting user's role from `/users/{uid}` and check `isActive`.
   - On `regStudents`:
     - **Read:** admin → all; agent → only rows where `createdBy == request.auth.uid`.
     - **Create:** writer must stamp their own `createdBy`, `source` must be a string, `isDeleted` must be false.
     - **Update:** admin only. Identity fields (`createdBy`, `courseId`, `courseFee`, `commissionRate`, `commissionAmount`, `createdAt`) are pinned — the rules reject mutations that change them.
     - **Delete:** disabled at the rules layer. Use soft delete (`isDeleted = true`) via `softDeleteStudent`.
   - On `regAuditLog`: read by admin only, create restricted to the requesting user's own uid, no update/delete ever.
   - On `regNotifications`: only the `isRead/readAt/readBy/emailSent*` fields are mutable; everything else is locked once written.

2. **Service-layer filters** (`src/lib/services/reg-*-service.ts`) — every query mirrors the rule constraints. An agent's `subscribeToMyStudents` explicitly adds `createdBy == agentUid` to its where-clause; the rule would reject otherwise but the explicit filter also reduces wasted reads.

3. **UI guards** — `RoleGate` (existing component) wraps each registration route in PR #2.

## Snapshotting for historical reports

`regStudents` records the **values at registration time**, not pointers:

- `courseFee` — locked. If a course is repriced, old records keep the old fee.
- `commissionRate` — locked. If the contract rate changes, old records keep the rate that was in force.
- `commissionAmount` — pre-computed (`courseFee × commissionRate`) to avoid floating-point recomputation drift across many viewers/exports.
- `currency` — locked.

`commissionFor(student)` in `reg-student-service.ts` returns the snapshotted amount; if missing (e.g., a corrupt legacy row), it recomputes from the snapshotted rate or falls back to `ACCEPTIX_COMMISSION_RATE`.

## File map

```
src/
  lib/
    types/index.ts                        ← UserRole `acceptix_agent` + Reg* types
    utils/validators.ts                   ← Zod: regCourseSchema, regStudentSchema, regAgentCreateSchema (strong password)
    registration/
      constants.ts                        ← ACCEPTIX_COMMISSION_RATE, labels, REG_ROUTES, computeCommission()
      seed-courses.ts                     ← Initial catalogue (ESP, exam prep, professional, diplomas)
    services/
      reg-course-service.ts               ← subscribeToCourses, createCourse, updateCourse, toggleActive
      reg-student-service.ts              ← subscribeToMyStudents, subscribeToAllStudents, createStudent, updateStudent, softDelete, restore
      reg-audit-service.ts                ← writeRegAuditLog (append-only)
      reg-notification-service.ts         ← emitNewStudentNotification, subscribeToAdminNotifications, markNotificationRead
  app/(registration)/
    layout.tsx                            ← ProtectedRoute → RegistrationShell
    registration/page.tsx                 ← Role-aware redirect entry
  components/registration/
    registration-shell.tsx                ← Minimal topbar shell (PR #2 swaps for full nav)

scripts/
  seed-registration-courses.ts            ← One-off seeder, REST-based, idempotent

firestore.rules                           ← Strict module-specific blocks (see "Security model")
firestore.indexes.json                    ← Composite indexes for the module's queries
```

## PR roadmap

| PR | Scope | External deps |
|----|-------|---------------|
| **#1 Foundation (this PR)** | Schema + rules + services + scaffolding | None |
| **#2 Agent Portal** | Login routing, `/registration/register-student`, `/registration/my-students` | None |
| **#3 Admin Console** | Dashboard, manage agents (Cloud Function for user creation), manage courses, all students | Cloud Functions (Blaze) |
| **#4 Reports + Email** | Reports (PDF + Excel) + commission summary + Resend email notifications | Resend account |

## Open work captured for later PRs

- **Cloud Function: `createAcceptixAgent`** — admin creates Firebase Auth user + `users/{uid}` doc atomically, sets `isActive: true`, role `acceptix_agent`. Strong password validated server-side (Zod schema already defined).
- **Cloud Function: `onRegStudentCreated`** — Firestore trigger that writes the email through Resend and updates `regNotifications.emailSent`.
- **Custom claims** — once Cloud Functions land, mirror `role` to a custom claim so Firestore rules can skip the `get()` lookup (cheaper, more cacheable).
- **UI "Seed default courses" button** — calls into `seed-courses.ts` from the admin courses page (in addition to the CLI script).
- **Playwright smoke tests** — login as agent → create student → admin sees notification.
