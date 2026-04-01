export type Language = "en" | "ar";

export type TranslationKey =
  | "dashboard"
  | "students"
  | "pipeline"
  | "payments"
  | "reports"
  | "settings"
  | "addStudent"
  | "save"
  | "cancel"
  | "delete"
  | "edit"
  | "archive"
  | "restore"
  | "search"
  | "filter"
  | "export"
  | "name"
  | "phone"
  | "email"
  | "date"
  | "status"
  | "action"
  | "lead"
  | "contacted"
  | "evaluated"
  | "enrolled"
  | "paid"
  | "lost"
  | "overview"
  | "evaluation"
  | "activity"
  | "documents"
  | "attendance"
  | "courses"
  | "auditLog"
  | "loginReport"
  | "addNote"
  | "followUp"
  | "recordPayment"
  | "setFees"
  | "totalFees"
  | "amountPaid"
  | "remaining"
  | "paymentSummary"
  | "leadSource"
  | "registrationDate"
  | "salesRep"
  | "interviewStatus"
  | "placementScore"
  | "finalLevel"
  | "completed"
  | "notCompleted"
  | "noPayments"
  | "noStudents"
  | "signOut"
  | "changePassword"
  | "loading"
  | "notFound"
  | "permissionDenied"
  | "close"
  | "confirm"
  | "markAsDone"
  | "pending"
  | "overdue"
  | "today"
  | "addSession"
  | "present"
  | "absent"
  | "attendanceRate"
  | "uploadDocument"
  | "noDocuments"
  | "download"
  | "deleteDocument"
  | "installmentPlan"
  | "createPlan"
  | "numberOfInstallments"
  | "startDate"
  | "preview"
  | "markAsPaid"
  | "dueDate"
  | "amount"
  | "installment"
  | "course"
  | "description"
  | "duration"
  | "level"
  | "maxStudents"
  | "active"
  | "inactive"
  | "addCourse"
  | "editCourse"
  | "deleteCourse"
  | "user"
  | "changes"
  | "entityType"
  | "entityId"
  | "enrollments"
  | "enrollInCourse"
  | "courseHistory"
  | "endDate"
  | "courseCategory"
  | "instructor"
  | "myStudents"
  | "myCourses"
  | "takeAttendance"
  | "late"
  | "certificate"
  | "generateCertificate"
  | "completionDate"
  | "onHold"
  | "dropped"
  | "generalEnglish"
  | "examPrep"
  | "professional"
  | "diploma"
  | "other"
  | "defaultFees"
  | "interestedCourse"
  | "civilId"
  | "coordinator"
  | "admin"
  | "sales"
  | "role";

export const translations: Record<Language, Record<TranslationKey, string>> = {
  en: {
    dashboard: "Dashboard",
    students: "Students",
    pipeline: "Pipeline",
    payments: "Payments",
    reports: "Reports",
    settings: "Settings",
    addStudent: "Add Student",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    archive: "Archive",
    restore: "Restore",
    search: "Search",
    filter: "Filter",
    export: "Export",
    name: "Name",
    phone: "Phone",
    email: "Email",
    date: "Date",
    status: "Status",
    action: "Action",
    lead: "Lead",
    contacted: "Contacted",
    evaluated: "Evaluated",
    enrolled: "Enrolled",
    paid: "Paid",
    lost: "Lost",
    overview: "Overview",
    evaluation: "Evaluation",
    activity: "Activity",
    documents: "Documents",
    attendance: "Attendance",
    courses: "Courses",
    auditLog: "Audit Log",
    loginReport: "Login Report",
    addNote: "Add Note",
    followUp: "Follow-up",
    recordPayment: "Record Payment",
    setFees: "Set Fees",
    totalFees: "Total Fees",
    amountPaid: "Amount Paid",
    remaining: "Remaining",
    paymentSummary: "Payment Summary",
    leadSource: "Lead Source",
    registrationDate: "Registration Date",
    salesRep: "Sales Rep",
    interviewStatus: "Interview Status",
    placementScore: "Placement Score",
    finalLevel: "Final Level",
    completed: "Completed",
    notCompleted: "Not Completed",
    noPayments: "No payments recorded",
    noStudents: "No students found",
    signOut: "Sign Out",
    changePassword: "Change Password",
    loading: "Loading...",
    notFound: "Not found",
    permissionDenied: "You don't have permission to view this page.",
    close: "Close",
    confirm: "Confirm",
    markAsDone: "Mark as Done",
    pending: "Pending",
    overdue: "Overdue",
    today: "Today",
    addSession: "Add Session",
    present: "Present",
    absent: "Absent",
    attendanceRate: "Attendance Rate",
    uploadDocument: "Upload Document",
    noDocuments: "No documents uploaded",
    download: "Download",
    deleteDocument: "Delete Document",
    installmentPlan: "Installment Plan",
    createPlan: "Create Plan",
    numberOfInstallments: "Number of Installments",
    startDate: "Start Date",
    preview: "Preview",
    markAsPaid: "Mark as Paid",
    dueDate: "Due Date",
    amount: "Amount",
    installment: "Installment",
    course: "Course",
    description: "Description",
    duration: "Duration",
    level: "Level",
    maxStudents: "Max Students",
    active: "Active",
    inactive: "Inactive",
    addCourse: "Add Course",
    editCourse: "Edit Course",
    deleteCourse: "Delete Course",
    user: "User",
    changes: "Changes",
    entityType: "Entity Type",
    entityId: "Entity ID",
    enrollments: "Enrollments",
    enrollInCourse: "Enroll in Course",
    courseHistory: "Course History",
    endDate: "End Date",
    courseCategory: "Course Category",
    instructor: "Instructor",
    myStudents: "My Students",
    myCourses: "My Courses",
    takeAttendance: "Take Attendance",
    late: "Late",
    certificate: "Certificate",
    generateCertificate: "Generate Certificate",
    completionDate: "Completion Date",
    onHold: "On Hold",
    dropped: "Dropped",
    generalEnglish: "General English",
    examPrep: "Exam Preparation",
    professional: "Professional",
    diploma: "Diploma",
    other: "Other",
    defaultFees: "Default Fees",
    interestedCourse: "Interested Course",
    civilId: "Civil ID",
    coordinator: "Coordinator",
    admin: "Admin",
    sales: "Sales",
    role: "Role",
  },
  ar: {
    dashboard: "لوحة التحكم",
    students: "الطلاب",
    pipeline: "خط المبيعات",
    payments: "المدفوعات",
    reports: "التقارير",
    settings: "الإعدادات",
    addStudent: "إضافة طالب",
    save: "حفظ",
    cancel: "إلغاء",
    delete: "حذف",
    edit: "تعديل",
    archive: "أرشفة",
    restore: "استعادة",
    search: "بحث",
    filter: "تصفية",
    export: "تصدير",
    name: "الاسم",
    phone: "الهاتف",
    email: "البريد الإلكتروني",
    date: "التاريخ",
    status: "الحالة",
    action: "الإجراء",
    lead: "عميل محتمل",
    contacted: "تم التواصل",
    evaluated: "تم التقييم",
    enrolled: "مسجل",
    paid: "مدفوع",
    lost: "خسارة",
    overview: "نظرة عامة",
    evaluation: "التقييم",
    activity: "النشاط",
    documents: "المستندات",
    attendance: "الحضور",
    courses: "الدورات",
    auditLog: "سجل المراجعة",
    loginReport: "تقرير تسجيل الدخول",
    addNote: "إضافة ملاحظة",
    followUp: "متابعة",
    recordPayment: "تسجيل دفعة",
    setFees: "تحديد الرسوم",
    totalFees: "إجمالي الرسوم",
    amountPaid: "المبلغ المدفوع",
    remaining: "المتبقي",
    paymentSummary: "ملخص المدفوعات",
    leadSource: "مصدر العميل",
    registrationDate: "تاريخ التسجيل",
    salesRep: "مندوب المبيعات",
    interviewStatus: "حالة المقابلة",
    placementScore: "درجة الاختبار",
    finalLevel: "المستوى النهائي",
    completed: "مكتمل",
    notCompleted: "غير مكتمل",
    noPayments: "لا توجد مدفوعات مسجلة",
    noStudents: "لا يوجد طلاب",
    signOut: "تسجيل الخروج",
    changePassword: "تغيير كلمة المرور",
    loading: "جار التحميل...",
    notFound: "غير موجود",
    permissionDenied: "ليس لديك صلاحية لعرض هذه الصفحة.",
    close: "إغلاق",
    confirm: "تأكيد",
    markAsDone: "تعليم كمنجز",
    pending: "قيد الانتظار",
    overdue: "متأخر",
    today: "اليوم",
    addSession: "إضافة جلسة",
    present: "حاضر",
    absent: "غائب",
    attendanceRate: "نسبة الحضور",
    uploadDocument: "رفع مستند",
    noDocuments: "لا توجد مستندات مرفوعة",
    download: "تحميل",
    deleteDocument: "حذف المستند",
    installmentPlan: "خطة التقسيط",
    createPlan: "إنشاء خطة",
    numberOfInstallments: "عدد الأقساط",
    startDate: "تاريخ البدء",
    preview: "معاينة",
    markAsPaid: "تعليم كمدفوع",
    dueDate: "تاريخ الاستحقاق",
    amount: "المبلغ",
    installment: "قسط",
    course: "الدورة",
    description: "الوصف",
    duration: "المدة",
    level: "المستوى",
    maxStudents: "الحد الأقصى للطلاب",
    active: "نشط",
    inactive: "غير نشط",
    addCourse: "إضافة دورة",
    editCourse: "تعديل الدورة",
    deleteCourse: "حذف الدورة",
    user: "المستخدم",
    changes: "التغييرات",
    entityType: "نوع الكيان",
    entityId: "معرف الكيان",
    enrollments: "التسجيلات",
    enrollInCourse: "تسجيل في دورة",
    courseHistory: "سجل الدورات",
    endDate: "تاريخ الانتهاء",
    courseCategory: "فئة الدورة",
    instructor: "المدرس",
    myStudents: "طلابي",
    myCourses: "دوراتي",
    takeAttendance: "تسجيل الحضور",
    late: "متأخر",
    certificate: "شهادة",
    generateCertificate: "إنشاء شهادة",
    completionDate: "تاريخ الإكمال",
    onHold: "معلق",
    dropped: "منسحب",
    generalEnglish: "إنجليزي عام",
    examPrep: "تحضير اختبارات",
    professional: "مهني",
    diploma: "دبلوم",
    other: "أخرى",
    defaultFees: "الرسوم الافتراضية",
    interestedCourse: "الدورة المهتم بها",
    civilId: "الرقم المدني",
    coordinator: "منسق إداري",
    admin: "مدير",
    sales: "مبيعات",
    role: "الدور",
  },
};
