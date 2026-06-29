export type Language = "en" | "ar";

// Keys are plain strings so screens can introduce module-specific keys without
// fighting a central union type. `KnownTranslationKey` documents the curated
// core vocabulary; a runtime check (scripts) guards against missing keys.
export type TranslationKey = string;

export type KnownTranslationKey =
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
  | "role"
  | "schedule"
  | "weeklySchedule";

export const translations: Record<Language, Record<string, string>> = {
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
    schedule: "Schedule",
    weeklySchedule: "Weekly Schedule",

    // ── Common actions & UI ──────────────────────────────────────────────
    add: "Add",
    create: "Create",
    update: "Update",
    view: "View",
    back: "Back",
    next: "Next",
    previous: "Previous",
    submit: "Submit",
    yes: "Yes",
    no: "No",
    all: "All",
    none: "None",
    selectOption: "Select...",
    required: "Required",
    optional: "Optional",
    actions: "Actions",
    details: "Details",
    total: "Total",
    notes: "Notes",
    note: "Note",
    type: "Type",
    category: "Category",
    from: "From",
    to: "To",
    of: "of",
    noResults: "No results",
    noData: "No data available",
    saving: "Saving...",
    saved: "Saved",
    errorOccurred: "An error occurred",
    tryAgain: "Try again",
    areYouSure: "Are you sure?",
    thisActionCannotBeUndone: "This action cannot be undone.",
    copy: "Copy",
    copied: "Copied",
    print: "Print",
    refresh: "Refresh",
    clear: "Clear",
    apply: "Apply",
    reset: "Reset",
    more: "More",
    remove: "Remove",
    select: "Select",
    selected: "Selected",
    showMore: "Show more",
    showLess: "Show less",
    viewAll: "View all",
    backToList: "Back to list",

    // ── Form fields ──────────────────────────────────────────────────────
    fullName: "Full Name",
    firstName: "First Name",
    lastName: "Last Name",
    gender: "Gender",
    male: "Male",
    female: "Female",
    nationality: "Nationality",
    address: "Address",
    dateOfBirth: "Date of Birth",
    age: "Age",
    password: "Password",
    confirmPassword: "Confirm Password",
    currentPassword: "Current Password",
    newPassword: "New Password",
    username: "Username",
    displayName: "Display Name",
    notesPlaceholder: "Write a note...",

    // ── Money & payments ─────────────────────────────────────────────────
    price: "Price",
    discount: "Discount",
    balance: "Balance",
    paymentMethod: "Payment Method",
    cash: "Cash",
    card: "Card",
    transfer: "Transfer",
    paymentDate: "Payment Date",
    receipt: "Receipt",
    invoice: "Invoice",
    outstandingBalance: "Outstanding Balance",
    paymentStatus: "Payment Status",
    fullyPaid: "Fully Paid",
    partiallyPaid: "Partially Paid",
    unpaid: "Unpaid",

    // ── Students & pipeline ──────────────────────────────────────────────
    studentDetails: "Student Details",
    newStudent: "New Student",
    editStudent: "Edit Student",
    assignedTo: "Assigned To",
    source: "Source",
    stage: "Stage",
    convert: "Convert",
    archived: "Archived",
    showArchived: "Show Archived",
    notesAndActivity: "Notes & Activity",

    // ── Dashboard & reports ──────────────────────────────────────────────
    totalStudents: "Total Students",
    totalRevenue: "Total Revenue",
    conversionRate: "Conversion Rate",
    pendingPayments: "Pending Payments",
    thisMonth: "This Month",
    lastMonth: "Last Month",
    allTime: "All Time",
    month: "Month",
    year: "Year",
    week: "Week",
    day: "Day",
    welcome: "Welcome",

    // ── Schedule & attendance ────────────────────────────────────────────
    time: "Time",
    room: "Room",
    teacher: "Teacher",
    session: "Session",
    excused: "Excused",

    // ── Settings & users ─────────────────────────────────────────────────
    users: "Users",
    addUser: "Add User",
    editUser: "Edit User",
    newUser: "New User",
    accountant: "Accountant",
    acceptixAgent: "Acceptix Agent",
    monthlyTarget: "Monthly Target",

    // ── Acceptix & registration ──────────────────────────────────────────
    registerStudent: "Register Student",
    registrations: "Registrations",
    agent: "Agent",
    agents: "Agents",

    // ── Auth ─────────────────────────────────────────────────────────────
    signIn: "Sign in",
    welcomeBack: "Welcome back",
    forgotPassword: "Forgot password?",
    resetPassword: "Reset Password",
    rememberMe: "Remember me",
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
    schedule: "الجدول",
    weeklySchedule: "الجدول الأسبوعي",

    // ── Common actions & UI ──────────────────────────────────────────────
    add: "إضافة",
    create: "إنشاء",
    update: "تحديث",
    view: "عرض",
    back: "رجوع",
    next: "التالي",
    previous: "السابق",
    submit: "إرسال",
    yes: "نعم",
    no: "لا",
    all: "الكل",
    none: "لا شيء",
    selectOption: "اختر...",
    required: "مطلوب",
    optional: "اختياري",
    actions: "إجراءات",
    details: "التفاصيل",
    total: "الإجمالي",
    notes: "ملاحظات",
    note: "ملاحظة",
    type: "النوع",
    category: "الفئة",
    from: "من",
    to: "إلى",
    of: "من",
    noResults: "لا توجد نتائج",
    noData: "لا توجد بيانات",
    saving: "جارٍ الحفظ...",
    saved: "تم الحفظ",
    errorOccurred: "حصل خطأ",
    tryAgain: "حاول تاني",
    areYouSure: "متأكد؟",
    thisActionCannotBeUndone: "الإجراء ده ملوش رجعة.",
    copy: "نسخ",
    copied: "تم النسخ",
    print: "طباعة",
    refresh: "تحديث",
    clear: "مسح",
    apply: "تطبيق",
    reset: "إعادة تعيين",
    more: "المزيد",
    remove: "إزالة",
    select: "اختيار",
    selected: "محدد",
    showMore: "عرض المزيد",
    showLess: "عرض أقل",
    viewAll: "عرض الكل",
    backToList: "الرجوع للقائمة",

    // ── Form fields ──────────────────────────────────────────────────────
    fullName: "الاسم الكامل",
    firstName: "الاسم الأول",
    lastName: "اسم العائلة",
    gender: "النوع",
    male: "ذكر",
    female: "أنثى",
    nationality: "الجنسية",
    address: "العنوان",
    dateOfBirth: "تاريخ الميلاد",
    age: "السن",
    password: "كلمة المرور",
    confirmPassword: "تأكيد كلمة المرور",
    currentPassword: "كلمة المرور الحالية",
    newPassword: "كلمة المرور الجديدة",
    username: "اسم المستخدم",
    displayName: "الاسم الظاهر",
    notesPlaceholder: "اكتب ملاحظة...",

    // ── Money & payments ─────────────────────────────────────────────────
    price: "السعر",
    discount: "الخصم",
    balance: "الرصيد",
    paymentMethod: "طريقة الدفع",
    cash: "نقدًا",
    card: "بطاقة",
    transfer: "تحويل",
    paymentDate: "تاريخ الدفع",
    receipt: "إيصال",
    invoice: "فاتورة",
    outstandingBalance: "الرصيد المتبقي",
    paymentStatus: "حالة الدفع",
    fullyPaid: "مدفوع بالكامل",
    partiallyPaid: "مدفوع جزئيًا",
    unpaid: "غير مدفوع",

    // ── Students & pipeline ──────────────────────────────────────────────
    studentDetails: "بيانات الطالب",
    newStudent: "طالب جديد",
    editStudent: "تعديل بيانات الطالب",
    assignedTo: "مُسنَد إلى",
    source: "المصدر",
    stage: "المرحلة",
    convert: "تحويل",
    archived: "مؤرشف",
    showArchived: "عرض المؤرشف",
    notesAndActivity: "الملاحظات والنشاط",

    // ── Dashboard & reports ──────────────────────────────────────────────
    totalStudents: "إجمالي الطلاب",
    totalRevenue: "إجمالي الإيرادات",
    conversionRate: "معدل التحويل",
    pendingPayments: "مدفوعات معلّقة",
    thisMonth: "الشهر ده",
    lastMonth: "الشهر اللي فات",
    allTime: "كل الفترات",
    month: "الشهر",
    year: "السنة",
    week: "الأسبوع",
    day: "اليوم",
    welcome: "أهلاً",

    // ── Schedule & attendance ────────────────────────────────────────────
    time: "الوقت",
    room: "القاعة",
    teacher: "المدرّس",
    session: "الحصة",
    excused: "بعذر",

    // ── Settings & users ─────────────────────────────────────────────────
    users: "المستخدمون",
    addUser: "إضافة مستخدم",
    editUser: "تعديل مستخدم",
    newUser: "مستخدم جديد",
    accountant: "محاسب",
    acceptixAgent: "وكيل Acceptix",
    monthlyTarget: "الهدف الشهري",

    // ── Acceptix & registration ──────────────────────────────────────────
    registerStudent: "تسجيل طالب",
    registrations: "التسجيلات",
    agent: "الوكيل",
    agents: "الوكلاء",

    // ── Auth ─────────────────────────────────────────────────────────────
    signIn: "تسجيل الدخول",
    welcomeBack: "أهلاً بعودتك",
    forgotPassword: "نسيت كلمة المرور؟",
    resetPassword: "إعادة تعيين كلمة المرور",
    rememberMe: "افتكرني",
  },
};
