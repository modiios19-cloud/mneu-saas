/** Keep actionable Firebase failures visible instead of hiding them behind the form modal. */
export function createMenuError(error: unknown): string {
  const value = error as { code?: string; message?: string } | null;
  const code = value?.code || '';
  if (code === 'permission-denied' || code === 'firestore/permission-denied') return 'رفض Firebase حفظ المنيو بسبب صلاحيات قاعدة البيانات. تأكد من تسجيل الدخول بحساب المدير ومن نشر قواعد Firestore المناسبة. لم يُنشأ المنيو.';
  if (code === 'unauthenticated' || code === 'firestore/unauthenticated') return 'انتهت جلسة تسجيل الدخول. سجّل الدخول مجددًا ثم حاول الإنشاء.';
  if (code === 'unavailable' || code === 'firestore/unavailable' || code === 'deadline-exceeded') return 'تعذر الاتصال بقاعدة البيانات. تحقق من اتصال الإنترنت ثم حاول مرة أخرى.';
  if (code === 'resource-exhausted') return 'تعذر الحفظ بسبب حدود Firebase أو حجم البيانات. تحقق من الحصص وحجم الصور والتصميم.';
  if (value?.message?.includes('يوجد منيو بهذا المعرف بالفعل')) return value.message;
  return `تعذر إنشاء المنيو${value?.message ? `: ${value.message}` : '. تحقق من اتصال Firebase.'}`;
}
