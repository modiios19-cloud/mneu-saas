export type DesignAudit = { level: 'ok' | 'warning'; text: string };
/** Static, best-effort checks only; no remote assets are fetched or executed. */
export function auditHtmlDesign(source: string): DesignAudit[] {
  if (!source.trim()) return [];
  const bytes = new Blob([source]).size;
  const checks: DesignAudit[] = [];
  const add = (ok: boolean, yes: string, no: string) => checks.push({ level: ok ? 'ok' : 'warning', text: ok ? yes : no });
  add(/<!doctype\s+html|<html[\s>]/i.test(source), 'يبدو أنه مستند HTML كامل.', 'يجب أن يكون التصميم مستند HTML كاملًا.');
  add(bytes <= 400_000, 'الكود ضمن حد الحفظ (400 كيلوبايت).', 'الكود يتجاوز 400 كيلوبايت.');
  add(/\bMENU_DATA\b/.test(source), 'يتضمن إشارة إلى بيانات المنيو.', 'لم نجد MENU_DATA؛ قد لا يعرض التصميم بيانات المنيو.');
  add(/menu-data-update/.test(source), 'يتضمن حدث تحديث البيانات.', 'لم نجد حدث تحديث البيانات؛ قد لا تتحدث المعاينة مباشرة.');
  add(/data-menu-edit|dataset\.menuEdit/.test(source), 'يتضمن علامات للتعديل المباشر.', 'لم نجد علامات التعديل المباشر؛ قد لا يعمل التعديل بالنقر.');
  const localAssets = /(?:src|href)\s*=\s*["'](?!https?:|data:|blob:|#|mailto:|tel:|\/\/|javascript:)[^"']+\.(?:css|js|png|jpe?g|webp|svg|gif|woff2?)(?:[?#][^"']*)?["']/i.test(source);
  if (localAssets) checks.push({ level: 'warning', text: 'قد يعتمد التصميم على ملفات محلية غير مرفوعة. استخدم ملفات مضمنة أو روابط عامة.' });
  if (/data:image\//i.test(source)) checks.push({ level: 'warning', text: 'توجد صور مضمّنة في الكود؛ تحقق من حجمها لضمان سرعة الفتح.' });
  if (/(?:src|href)\s*=\s*["']https?:\/\/|url\(\s*["']?https?:\/\/|@import\s+["']https?:\/\//i.test(source)) checks.push({ level: 'warning', text: 'رُصد رابط خارجي في التصميم؛ لم يُفحص حجمه أو توفره. تحقق من الملفات والصور واختبر الشبكة الضعيفة.' });
  checks.push({ level: 'warning', text: 'الفحص تقريبي، ولا يضمن عمل التصميم أو أمانه؛ عاينه واستخدم كودًا موثوقًا.' });
  return checks;
}
