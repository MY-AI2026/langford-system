# Langford System — Major Feature Upgrade Plan

## Overview
Upgrade the system with: Enrollment System, Instructor Portal, Certificate Generator, Enhanced Course Catalog, and all professional features.

---

## Phase 1: Course Catalog Upgrade

### 1.1 Update Course Data Model
**File:** `src/lib/types/index.ts`
- Add `CourseCategory` type: `"general_english" | "esp" | "conversation" | "exam_prep" | "school" | "professional" | "diploma"`
- Update `Course` interface with: `category`, `level`, `defaultFees`, `currency`, `levels[]` (sub-levels)

### 1.2 Seed All 23 Courses in Firestore
Delete existing test courses, add all real courses:
- General English (Starter 1/2, Elementary 1/2, Pre-Intermediate 1/2, Intermediate 1/2, Upper-Intermediate 1/2, Advanced 1/2) — 12 courses
- ESP, Conversation, IELTS, TOEFL, School — 5 courses
- Accounting, Management, HR, AI — 4 professional courses
- PCD Diploma, Speak Smart Diploma (Elementary), Speak Smart Diploma (Intermediate) — 3 diplomas

### 1.3 Update Courses Page
**File:** `src/app/(dashboard)/settings/courses/page.tsx`
- Add category filter tabs
- Add defaultFees field
- Show course count per category

---

## Phase 2: Enrollment System

### 2.1 New Types
**File:** `src/lib/types/index.ts`
```
EnrollmentStatus = "active" | "completed" | "dropped" | "on_hold"

Enrollment {
  id, studentId, courseId, courseName, courseCategory
  level?, startDate, endDate?, status: EnrollmentStatus
  fees, amountPaid, remainingBalance
  instructorId?, instructorName?
  notes?, createdBy, createdAt, updatedAt
}
```

### 2.2 New Service
**File:** `src/lib/services/enrollment-service.ts`
- `subscribeToEnrollments(studentId, callback)` — REST polling
- `createEnrollment(studentId, data)` — SDK write
- `updateEnrollment(studentId, enrollmentId, data)` — SDK write
- `completeEnrollment(studentId, enrollmentId)` — Mark completed
- `getStudentEnrollmentHistory(studentId)` — All enrollments

**Firestore:** `students/{studentId}/enrollments/{enrollmentId}`

### 2.3 Add "interestedCourse" to Student
**File:** `src/lib/types/index.ts`
- Add `interestedCourse?: string` to Student interface

**File:** Student form and detail page
- Dropdown from course catalog in student creation form
- Show in Overview tab

### 2.4 Enrollments Tab in Student Detail
**File:** `src/app/(dashboard)/students/[studentId]/page.tsx`
- New tab: "Enrollments" (between Overview and Evaluation)
- Shows all enrollments with status badges
- "Enroll in Course" button → Dialog with course dropdown, fees, start date
- Course history table: Course Name | Period | Status | Fees | Paid

### 2.5 Link Payments to Courses
- Add `courseId?` and `courseName?` to Payment type
- Payment form shows course dropdown when enrollments exist
- Receipt shows course name

---

## Phase 3: Instructor Role & Portal

### 3.1 Update User Role
**File:** `src/lib/types/index.ts`
- `UserRole = "admin" | "sales" | "instructor"`

### 3.2 Update Auth & RoleGate
- `RoleGate` already works with role array — just add "instructor"
- Auth context already reads role from Firestore

### 3.3 Add Instructor Fields to User & Course
- User: `assignedCourses?: string[]`
- Course: `instructorId?: string`, `instructorName?: string`

### 3.4 Instructor Dashboard
**File:** `src/app/(dashboard)/dashboard/page.tsx`
- If role === "instructor": Show "My Courses" with student count + attendance rate
- No financial data, no sales data

### 3.5 Instructor Attendance Page
**File:** `src/app/(dashboard)/attendance/page.tsx` (new)
- Lists instructor's assigned courses
- Click course → See enrolled students
- "Take Attendance" button → Mark present/absent/late per student per date
- Attendance history with filters

### 3.6 Update Sidebar
- Instructor nav: Dashboard, My Courses, Attendance

### 3.7 Attendance Model Update
- Add `courseId`, `courseName`, `instructorId` to AttendanceSession
- New subcollection path stays: `students/{studentId}/attendance/{sessionId}`

---

## Phase 4: Certificate Generator

### 4.1 Certificate Service
**File:** `src/lib/services/certificate-service.ts`
- `generateCertificate(studentId, enrollmentId)` — Creates HTML certificate
- Certificate stored as metadata in enrollment (not a separate collection)

### 4.2 Certificate Component
**File:** `src/components/students/certificate-dialog.tsx`
- Preview certificate in dialog
- Print button opens new window with professional HTML certificate
- Includes: Logo, student name, course name, completion date, certificate number

### 4.3 Integration
- "Generate Certificate" button appears on completed enrollments
- Admin can generate certificates from Enrollments tab

---

## Phase 5: Enhanced Reports & Analytics

### 5.1 Revenue by Course Report
- Chart showing revenue per course
- Computed from enrollments data

### 5.2 Student Retention Report
- Students who enrolled in multiple courses
- Re-enrollment rate

### 5.3 Instructor Performance
- Attendance rates per instructor
- Student count per instructor

### 5.4 Enhanced Sales Funnel
- Conversion at each stage with percentages
- Drop-off points visualization

---

## Phase 6: Automation & Notifications

### 6.1 Absent Alert System
- 3 consecutive absences → Badge/notification for sales & admin

### 6.2 Course Completion Workflow
- When course end date passes → Suggest next level enrollment

### 6.3 Overdue Payment Reminders
- Enhanced overdue detection with days count

---

## Implementation Order (by Agent)

### Agent 1: Backend — Types, Services, Data
1. Update types (Course, Enrollment, User, Attendance, Payment)
2. Create enrollment-service.ts
3. Update course-service.ts
4. Update attendance-service.ts
5. Update payment-service.ts
6. Seed all 23 courses in Firestore
7. Update Firestore rules for instructor role

### Agent 2: Frontend — Pages & Components
1. Enrollments tab + Enroll dialog in student detail
2. Enhanced courses page with categories
3. Instructor dashboard view
4. Instructor attendance page
5. Certificate dialog component
6. Updated payment form with course dropdown
7. Updated receipt with course info
8. interestedCourse in student form & overview

### Agent 3: Reports & Polish
1. Revenue by course report
2. Student retention metrics
3. Instructor performance report
4. Enhanced sales funnel analytics
5. Sidebar updates for instructor role
6. Translation keys for all new text

### Agent 4: QA & Testing
1. TypeScript validation (0 errors)
2. Build validation
3. Test all REST queries work
4. Test role-based access (admin, sales, instructor)
5. Test enrollment CRUD
6. Test attendance by instructor
7. Test certificate generation
8. Final Vercel deployment

---

## Files to Create (New)
- `src/lib/services/enrollment-service.ts`
- `src/lib/services/certificate-service.ts`
- `src/app/(dashboard)/attendance/page.tsx`
- `src/components/students/enrollment-tab.tsx`
- `src/components/students/enroll-dialog.tsx`
- `src/components/students/certificate-dialog.tsx`

## Files to Modify
- `src/lib/types/index.ts` — New types
- `src/lib/utils/constants.ts` — New constants
- `src/lib/i18n/translations.ts` — New translation keys
- `src/lib/services/course-service.ts` — Enhanced model
- `src/lib/services/attendance-service.ts` — courseId field
- `src/lib/services/payment-service.ts` — courseId link
- `src/app/(dashboard)/students/[studentId]/page.tsx` — New Enrollments tab
- `src/app/(dashboard)/students/new/page.tsx` — interestedCourse field
- `src/app/(dashboard)/settings/courses/page.tsx` — Category filters
- `src/app/(dashboard)/dashboard/page.tsx` — Instructor view
- `src/app/(dashboard)/reports/page.tsx` — New charts
- `src/components/layout/sidebar.tsx` — Instructor nav
- `src/components/payments/payment-form.tsx` — Course dropdown
- `src/components/payments/payment-receipt-dialog.tsx` — Course in receipt
- `src/components/students/student-form.tsx` — interestedCourse
- `firestore.rules` — Instructor access
