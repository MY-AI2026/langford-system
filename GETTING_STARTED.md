# 🚀 Langford System - دليل البدء السريع

## الخطوة 1️⃣: تشغيل السكريبت الأولي (مرة واحدة فقط)

قم بتشغيل هذا الأمر **مرة واحدة فقط** لإعداد النظام:

```bash
npx tsx scripts/initial-setup.ts
```

هذا السكريبت سوف:
- ✅ إنشاء حساب المدير (Admin)
- ✅ إعداد إعدادات النظام الافتراضية
- ✅ إضافة جميع الـ 24 دورة إلى النظام

## الخطوة 2️⃣: تسجيل الدخول

بعد تشغيل السكريبت، افتح:
👉 https://langford-system.vercel.app

**بيانات تسجيل الدخول:**
- 📧 البريد الإلكتروني: `admin@langford.edu.kw`
- 🔑 كلمة المرور: `Langford@2025`

## الخطوة 3️⃣: إنشاء المستخدمين

1. سجل دخول كمدير
2. اذهب إلى: **Settings** → **Users** → **Add New User**
3. أنشئ المستخدمين التاليين:
   - **Admin** - صلاحيات كاملة
   - **Coordinator** (منسق إداري) - تسجيل الطلاب وربط المدرسين
   - **Sales** (مبيعات) - إدارة الطلاب والمدفوعات
   - **Instructor** (مدرس) - تسجيل الحضور فقط

## الخطوة 4️⃣: ابدأ العمل! 🎉

الآن يمكنك:
- ➕ إضافة طلاب جدد
- 📚 تسجيل الطلاب في الدورات
- 💰 تسجيل المدفوعات
- 📊 متابعة التقارير
- 👨‍🏫 تعيين المدرسين للدورات

---

## 🔧 أوامر مفيدة

### تشغيل النظام محلياً:
```bash
npm run dev
```
افتح: http://localhost:3000

### نشر التعديلات على Vercel:
```bash
npx vercel --prod
```

### تحديث قواعد Firestore:
```bash
npx firebase deploy --only firestore:rules
```

---

## 📚 الدورات المتوفرة في النظام

### إنجليزي عام (12 مستوى):
- Starter 1 & 2
- Elementary 1 & 2
- Pre-Intermediate 1 & 2
- Intermediate 1 & 2
- Upper-Intermediate 1 & 2
- Advanced 1 & 2

### تحضير الاختبارات:
- IELTS Preparation
- TOEFL Preparation

### دورات مهنية:
- ESP (English for Specific Purposes)
- Accounting English
- Management English
- HR English
- AI & Technology English

### دبلومات:
- PCD Diploma
- Speak Smart Diploma (Elementary)
- Speak Smart Diploma (Intermediate)

### دورات أخرى:
- Conversation Course
- School Support

---

## 🆘 الدعم

إذا واجهت أي مشكلة:
1. تحقق من ملف `.env.local` وتأكد من وجود جميع متغيرات Firebase
2. تأكد من أن Firebase Authentication مفعل في Firebase Console
3. تأكد من نشر قواعد Firestore

**Firebase Console:**
https://console.firebase.google.com/project/langford-system

**Vercel Dashboard:**
https://vercel.com/dashboard
