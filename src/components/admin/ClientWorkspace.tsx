import React, { useEffect, useMemo, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import QRCode from 'qrcode';
import { db } from '../../lib/firebase';
import { isTemporaryMenuUrl, menuUrl } from '../../lib/menuUrl';
import { whatsappDigits } from '../../lib/phone';
import { RestaurantData } from '../../types/restaurant';

export const WORK_STAGES = ['عميل جديد', 'بانتظار الهوية', 'التصميم قيد التنفيذ', 'بانتظار المراجعة', 'جاهز للنشر', 'منشور', 'يحتاج تحديث'] as const;
export type WorkData = { stage: string; reminderDate: string; reminderNote: string; identityNotes: string; deliveryMessage: string; updatedAt?: string };
export const DEFAULT_WORK: WorkData = { stage: 'عميل جديد', reminderDate: '', reminderNote: '', identityNotes: '', deliveryMessage: 'مرحبًا {client}، تم تجهيز منيو {restaurant}. رابط المنيو: {url}\nيمكنك استخدام الرابط في حسابات التواصل، وإرسال أي ملاحظات لنا هنا.' };

type Props = { restaurant: RestaurantData; publicBaseUrl?: string; onClose: () => void; onUpdated: (id: string, data: WorkData) => void };
export function ClientWorkspace({ restaurant, publicBaseUrl, onClose, onUpdated }: Props) {
  const [work, setWork] = useState<WorkData>(DEFAULT_WORK);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [qr, setQr] = useState('');
  const url = menuUrl(restaurant.slug, publicBaseUrl);
  const products = restaurant.products || [];
  const missingImages = products.filter(p => !p.imageUrl?.trim()).length;
  const missingDescriptions = products.filter(p => !p.descriptionAr?.trim()).length;
  const fields = useMemo(() => ({ '{client}': restaurant.client?.name || restaurant.name, '{restaurant}': restaurant.name, '{url}': url }), [restaurant, url]);
  const message = Object.entries(fields).reduce((text, [key, value]) => text.replaceAll(key, value), work.deliveryMessage);

  useEffect(() => {
    let alive = true;
    setLoading(true); setError(''); setWork(DEFAULT_WORK);
    getDoc(doc(db, 'clientWorkspace', restaurant.id)).then(snapshot => {
      if (alive && snapshot.exists()) setWork({ ...DEFAULT_WORK, ...snapshot.data() } as WorkData);
    }).catch(() => alive && setError('تعذر تحميل ملف العمل. تحقق من صلاحيات Firebase.')).finally(() => alive && setLoading(false));
    QRCode.toDataURL(url, { width: 600, margin: 2 }).then(value => alive && setQr(value)).catch(() => alive && setError('تعذر إنشاء رمز QR.'));
    return () => { alive = false; };
  }, [restaurant.id, url]);

  const save = async () => {
    setSaving(true); setError('');
    try {
      const next = { ...work, updatedAt: new Date().toISOString() };
      await setDoc(doc(db, 'clientWorkspace', restaurant.id), next, { merge: true });
      setWork(next); onUpdated(restaurant.id, next);
    } catch { setError('تعذر الحفظ. تحقق من الاتصال وصلاحيات Firebase.'); }
    finally { setSaving(false); }
  };
  const update = (field: keyof WorkData, value: string) => setWork(old => ({ ...old, [field]: value }));
  const digits = whatsappDigits(restaurant.client?.phone || '');
  const area = 'w-full rounded-xl border border-white/10 bg-zinc-950 p-3 text-sm text-white';
  return <div className="fixed inset-0 z-[130] overflow-y-auto bg-black/80 p-3 sm:p-6" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <section dir="rtl" className="mx-auto max-w-3xl space-y-5 rounded-3xl border border-white/10 bg-[#1c1c1e] p-5 text-white sm:p-7">
      <header className="flex justify-between gap-3"><div><p className="text-xs text-amber-300">ملف العمل الخاص بالإدارة</p><h3 className="text-xl font-black">{restaurant.name}</h3></div><button onClick={onClose} className="rounded-lg border border-white/10 px-3 py-2 text-sm">إغلاق</button></header>
      {loading ? <p className="text-sm text-zinc-400">جارٍ تحميل الملف…</p> : <>
        {error && <p role="alert" className="rounded-xl bg-red-900/30 p-3 text-sm text-red-200">{error}</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-xs text-zinc-300">مرحلة العمل<select className={area} value={work.stage} onChange={e => update('stage', e.target.value)}>{WORK_STAGES.map(stage => <option key={stage}>{stage}</option>)}</select></label>
          <label className="space-y-1 text-xs text-zinc-300">تاريخ التذكير<input className={area} type="date" value={work.reminderDate} onChange={e => update('reminderDate', e.target.value)}/></label>
        </div>
        <label className="block space-y-1 text-xs text-zinc-300">ملاحظة التذكير<input className={area} value={work.reminderNote} onChange={e => update('reminderNote', e.target.value)} placeholder="مثال: متابعة موافقة العميل"/></label>
        <label className="block space-y-1 text-xs text-zinc-300">الهوية وملاحظات العمل<textarea className={area} rows={3} value={work.identityNotes} onChange={e => update('identityNotes', e.target.value)} placeholder="الخطوط والألوان وروابط ملفات الهوية وملاحظات العميل"/></label>
        <button disabled={saving} onClick={save} className="rounded-xl bg-amber-300 px-4 py-2 text-sm font-bold text-black disabled:opacity-50">{saving ? 'جارٍ الحفظ…' : 'حفظ ملف العمل والتذكير'}</button>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm space-y-2"><h4 className="font-black text-amber-300">تقرير جودة المنيو</h4>
          <p>الأقسام: {restaurant.categories.filter(c => c.id !== 'all').length} · الأصناف: {products.length} · بلا صورة: {missingImages} · بلا وصف عربي: {missingDescriptions}</p>
          <p>التواصل: {restaurant.contact?.phone ? 'اتصال ✓' : 'اتصال غير مضاف'} · {restaurant.contact?.whatsapp ? 'واتساب ✓' : 'واتساب غير مضاف'} · {restaurant.contact?.maps ? 'موقع ✓' : 'موقع غير مضاف'}</p>
          <p className="text-xs text-zinc-400">هذه مراجعة للبيانات المسجلة، وليست اختبارًا فعليًا للروابط أو جودة الصور.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4 space-y-3"><h4 className="font-black text-amber-300">باقة التسليم</h4>
          {isTemporaryMenuUrl(url) && <p className="text-xs text-amber-200">هذا رابط معاينة مؤقت. استخدم الموقع المنشور للحصول على رابط صالح للطباعة أو الإرسال.</p>}
          <div dir="ltr" className="break-all text-xs text-zinc-300">{url}</div>
          <div className="flex flex-wrap gap-2"><button onClick={() => navigator.clipboard.writeText(url)} className="rounded-lg border border-white/15 px-3 py-2 text-xs">نسخ الرابط</button>{qr && <a href={qr} download={`QR-${restaurant.slug}.png`} className="rounded-lg border border-white/15 px-3 py-2 text-xs">تنزيل QR</a>}</div>
          <label className="block space-y-1 text-xs text-zinc-300">رسالة التسليم القابلة للتعديل<textarea className={area} rows={4} value={work.deliveryMessage} onChange={e => update('deliveryMessage', e.target.value)}/></label>
          <p className="text-xs text-zinc-400">المتغيرات: {'{client}'}، {'{restaurant}'}، {'{url}'}. احفظ ملف العمل للاحتفاظ بنص الرسالة.</p>
          {digits ? <a href={`https://wa.me/${digits}?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer" className="inline-block rounded-xl bg-green-500 px-4 py-2 text-sm font-bold text-black">فتح واتساب العميل برسالة التسليم</a> : <p className="text-xs text-amber-200">أضف رقم العميل من «تعديل البيانات» لتفعيل واتساب.</p>}
          <p className="text-xs text-zinc-400">ستفتح المحادثة بالرسالة؛ راجعها وأرسلها بنفسك.</p>
        </div>
      </>}
    </section>
  </div>;
}
