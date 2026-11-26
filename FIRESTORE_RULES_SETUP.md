# إعداد حماية لوحة الإدارة

يحتوي هذا المشروع على شاشة دخول إدارية. في Firebase Authentication أنشئ حساب المدير يدويًا من تبويب **Users**، وتأكد أن UID للحساب هو UID المعتمد في `src/App.tsx`. لا تضف شاشة تسجيل حسابات عامة.

بعد ذلك افتح **Firestore Database → Rules**، واستبدل القواعد المؤقتة بالقواعد التالية ثم اضغط **Publish**:

```text
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /publicReports/{reportId} {
      allow read: if resource.data.expiresAt is timestamp
        && request.time < resource.data.expiresAt;
      allow write: if request.auth != null
        && request.auth.uid == 'VZMngh2pukhR8r2RoZpNIopt4R82';
    }

    match /restaurants/{restaurantId} {
      allow read: if true;
      allow write: if request.auth != null
        && request.auth.uid == 'VZMngh2pukhR8r2RoZpNIopt4R82';
    }

    match /{document=**} {
      allow read, write: if request.auth != null
        && request.auth.uid == 'VZMngh2pukhR8r2RoZpNIopt4R82';
    }
  }
}
```

تنتهي صلاحية روابط التقارير بعد 90 يومًا. قواعد Firestore الموجودة في المستودع لا تُنشر تلقائيًا؛ يجب نسخ الملف `firestore.rules` كاملًا إلى **Firebase Console → Firestore Database → Rules** ثم الضغط على **Publish** قبل إرسال أي تقرير. التقرير لا يعرض لقطة للمنيو. أرقام الزيارات والذروة الحالية تجريبية وليست قياسًا فعليًا؛ يجب ربط التتبع الحقيقي قبل إرسال تقارير إطلاق للعملاء. لا يوجد نظام طلبات أو إيرادات في التطبيق حاليًا.

بهذا يستطيع الزوار قراءة وثائق المطاعم لعرض المنيو، بينما تقتصر بقية القراءة والكتابة على حساب المدير. لا تستخدم قاعدة عامة من نوع `request.auth != null` وحدها؛ فهي تسمح لأي حساب مسجل بالدخول إلى بيانات الإدارة.

## اختبار الدخول

1. افتح التطبيق مع `?admin=true`.
2. سجّل الدخول بحساب المدير الذي أنشأته في Firebase Authentication.
3. جرّب فتح لوحة الإدارة بحساب آخر؛ يجب أن تظهر رسالة منع الوصول.
4. تحقق من أن حفظ بيانات المطعم يعمل بحساب المدير.

لا تحفظ كلمة المرور في ملفات المشروع أو ترسلها في المحادثة.

## التحديثات الخاصة بالمعاينة والنسخ

- ملف `firestore.rules` هو المرجع الكامل للقواعد. القواعد القديمة الموضحة أعلاه لا تتضمن `publicMenuPreviews`؛ انسخ **الملف كاملًا** عند تجهيز نسخة اختبارية، لا مقتطف القواعد القديم. لا ينشر المشروع القواعد تلقائيًا.
- تحفظ روابط المعاينة لقطة من بيانات المنيو العامة لمدة 7 أيام؛ أي شخص لديه الرابط يمكنه فتحها قبل انتهائها. انتهاء صلاحية القراءة لا يحذف الوثيقة من Firestore تلقائيًا.
- تحفظ النسخ السابقة تحت `restaurants/{id}/versions`، وملفات العمل تحت `clientWorkspace` والمسودات تحت `menuDrafts`؛ يجب أن تظل للمدير فقط. احتفظ بنسخة احتياطية واختبر في مشروع Firebase تجريبي قبل نشر القواعد أو التغييرات على المشروع الفعلي.
- بيانات `client` القديمة ما زالت في وثيقة المطعم العامة، ولم تُنقل في هذا التحديث؛ لا تعتبرها خاصة حتى يتم فصلها ومراجعة القواعد ونقل البيانات القديمة بأمان.
