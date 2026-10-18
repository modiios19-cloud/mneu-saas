import React, { useMemo, useState } from 'react';
import { addDoc, collection, serverTimestamp, Timestamp } from 'firebase/firestore';
import { ArrowUpRight, CalendarDays, FileBarChart2, MessageCircle, Search, X } from 'lucide-react';
import { db } from '../../lib/firebase';
import { RestaurantData } from '../../types/restaurant';

type Props = { restaurants: RestaurantData[]; venueTypes?: { id: string; labelAr: string }[]; onToast: (message: string) => void };
const today = () => new Date().toLocaleDateString('en-CA');
const initialStart = () => { const d = new Date(); d.setDate(1); return d.toLocaleDateString('en-CA'); };
const typeName = (type?: string) => type === 'cafe' ? 'مقهى' : type === 'restaurant' ? 'مطعم' : type || 'منشأة';

export const CustomerReports: React.FC<Props> = ({ restaurants, venueTypes = [], onToast }) => {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<RestaurantData | null>(null);
  const filtered = useMemo(() => restaurants.filter(r => `${r.name} ${r.id} ${r.contact?.phone || ''}`.toLowerCase().includes(query.toLowerCase())), [restaurants, query]);

  return <section className="space-y-5 text-white">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-sm text-zinc-400">إدارة بيانات العملاء ومشاركة تقاريرهم بأمان</p><h2 className="mt-1 text-2xl font-black">إدارة العملاء</h2></div>
      <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5"><Search size={16} className="text-zinc-400"/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="ابحث بالاسم أو الكود أو الرقم" className="w-64 max-w-full bg-transparent text-sm outline-none"/></label>
    </header>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {filtered.map(r => <article key={r.id} className="rounded-2xl border border-white/10 bg-[#202022] p-4">
        <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3">{r.logoUrl ? <img src={r.logoUrl} alt="" className="h-11 w-11 rounded-xl object-cover"/> : <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#F7E354] text-zinc-900"><FileBarChart2 size={20}/></div>}<div className="min-w-0"><h3 className="truncate font-extrabold">{r.name}</h3><p className="mt-0.5 text-xs text-zinc-400">{venueTypes.find(t => t.id === r.type)?.labelAr || typeName(r.type)} · الكود {r.id}</p></div></div><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${r.isActive === false ? 'bg-zinc-700 text-zinc-300' : 'bg-emerald-400/10 text-emerald-300'}`}>{r.isActive === false ? 'متوقف' : 'نشط'}</span></div>
        <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3"><span className="text-sm text-zinc-400" dir="ltr">{r.contact?.phone || r.contact?.whatsapp || 'لا يوجد رقم مسجل'}</span><button onClick={() => setSelected(r)} className="inline-flex items-center gap-2 rounded-xl bg-[#F7E354] px-3 py-2 text-xs font-black text-zinc-900"><FileBarChart2 size={15}/> إعداد التقرير</button></div>
      </article>)}
      {!filtered.length && <div className="col-span-full rounded-2xl border border-dashed border-white/15 p-10 text-center text-sm text-zinc-400">لا توجد نتائج مطابقة.</div>}
    </div>
    {selected && <ReportComposer restaurant={selected} onClose={() => setSelected(null)} onToast={onToast}/>}
  </section>;
};

function ReportComposer({ restaurant, onClose, onToast }: { restaurant: RestaurantData; onClose: () => void; onToast: (message: string) => void }) {
  const [startDate, setStartDate] = useState(initialStart);
  const [endDate, setEndDate] = useState(today);
  const [customMessage, setCustomMessage] = useState('مرحباً {name}، تقرير نشاط منيو {restaurant} للفترة من {start} إلى {end}: {url}');
  const [includeMenu, setIncludeMenu] = useState(true);
  const [includeStatus, setIncludeStatus] = useState(true);
  const [busy, setBusy] = useState(false);
  const phone = restaurant.contact?.whatsapp || restaurant.contact?.phone || '';
  const chooseRange = (kind: 'week' | 'month') => { const d = new Date(); if (kind === 'week') d.setDate(d.getDate() - 6); else d.setDate(1); setStartDate(d.toLocaleDateString('en-CA')); setEndDate(today()); };
  const send = async () => {
    if (!db) { onToast('اتصال قاعدة البيانات غير متاح'); return; }
    if (!phone) { onToast('أضف رقم واتساب أو الهاتف في بيانات المنشأة أولاً'); return; }
    if (!startDate || !endDate || startDate > endDate) { onToast('تحقق من تاريخ بداية ونهاية الفترة'); return; }
    const whatsappWindow = window.open('', '_blank');
    if (!whatsappWindow) { onToast('اسمح بفتح النوافذ المنبثقة لإكمال الإرسال'); return; }
    setBusy(true);
    try {
      const ref = await addDoc(collection(db, 'publicReports'), {
        restaurant: { id: restaurant.id, name: restaurant.name, type: restaurant.type || 'restaurant', logoUrl: restaurant.logoUrl || '', currency: restaurant.currency || 'ر.س' },
        period: { startDate, endDate },
        sections: { menu: includeMenu, status: includeStatus },
        metrics: { views: null, qrScans: null, orders: null, revenue: null },
        menu: includeMenu ? { categories: (restaurant.categories || []).map(c => ({ name: c.labelAr || c.name || c.id, itemCount: restaurant.products.filter(p => p.categoryId === c.id).length })), productCount: restaurant.products.length, activeProductCount: restaurant.products.filter(p => !p.isSoldOut).length } : null,
        status: includeStatus ? { active: restaurant.isActive !== false, generatedAt: new Date().toISOString() } : null,
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromDate(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000))
      });
      const url = new URL(window.location.href); url.search = ''; url.searchParams.set('report', ref.id);
      const reportUrl = url.toString();
      const message = customMessage.replaceAll('{name}', restaurant.name).replaceAll('{restaurant}', restaurant.name).replaceAll('{start}', startDate).replaceAll('{end}', endDate).replaceAll('{url}', reportUrl);
      const digits = phone.replace(/\D/g, '');
      if (!digits) throw new Error('رقم الهاتف غير صالح');
      whatsappWindow.location.href = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
      onToast('تم إنشاء رابط التقرير وفتح واتساب لمراجعته وإرساله'); onClose();
    } catch (error) { whatsappWindow.close(); console.error(error); onToast('تعذر إنشاء التقرير. تحقق من قواعد Firestore المنشورة.'); }
    finally { setBusy(false); }
  };
  return <div className="fixed inset-0 z-[120] grid place-items-center bg-black/75 p-3 sm:p-6" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><div className="max-h-[92vh] w-full max-w-xl overflow-auto rounded-3xl border border-white/10 bg-[#1c1c1e] p-5 shadow-2xl sm:p-7">
    <div className="flex items-start justify-between"><div><span className="text-xs font-bold text-[#F7E354]">تقرير عميل</span><h3 className="mt-1 text-xl font-black">{restaurant.name}</h3></div><button onClick={onClose} className="rounded-lg p-2 text-zinc-400 hover:bg-white/10"><X size={19}/></button></div>
    <div className="mt-5 grid grid-cols-2 gap-3"><label className="text-xs font-bold text-zinc-300">من<input type="date" value={startDate} max={endDate} onChange={e => setStartDate(e.target.value)} className="mt-2 block w-full rounded-xl border border-white/10 bg-[#111] p-3 text-sm text-white"/></label><label className="text-xs font-bold text-zinc-300">إلى<input type="date" value={endDate} max={today()} onChange={e => setEndDate(e.target.value)} className="mt-2 block w-full rounded-xl border border-white/10 bg-[#111] p-3 text-sm text-white"/></label></div>
    <div className="mt-3 flex gap-2"><button onClick={() => chooseRange('week')} className="rounded-lg bg-white/5 px-3 py-2 text-xs">آخر 7 أيام</button><button onClick={() => chooseRange('month')} className="rounded-lg bg-white/5 px-3 py-2 text-xs">هذا الشهر</button><span className="inline-flex items-center gap-1 text-xs text-zinc-500"><CalendarDays size={14}/> فترة مخصصة متاحة</span></div>
    <div className="mt-5 space-y-3"><p className="text-xs font-bold text-zinc-300">محتويات التقرير</p><label className="flex gap-2 text-sm"><input type="checkbox" checked={includeMenu} onChange={e => setIncludeMenu(e.target.checked)}/>ملخص المنيو والأقسام والأصناف</label><label className="flex gap-2 text-sm"><input type="checkbox" checked={includeStatus} onChange={e => setIncludeStatus(e.target.checked)}/>حالة المنيو وقت إنشاء التقرير</label><div className="rounded-xl border border-amber-300/20 bg-amber-300/5 p-3 text-xs leading-5 text-amber-100">ملخص المنيو لقطة حالية عند إعداد التقرير، وليس سجلًا تاريخيًا للفترة. بيانات الزيارات ومسح QR والطلبات والإيرادات غير متاحة بعد؛ لم يُفعّل تتبع فعلي لها.</div></div>
    <label className="mt-5 block text-xs font-bold text-zinc-300">نص رسالة واتساب <span className="font-normal text-zinc-500">(المتغيرات: {'{name}'}, {'{start}'}, {'{end}'}, {'{url}'})</span><textarea rows={3} value={customMessage} onChange={e => setCustomMessage(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#111] p-3 text-sm leading-6 text-white outline-none focus:border-[#F7E354]"/></label>
    <button disabled={busy} onClick={send} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#F7E354] py-3 font-black text-zinc-900 disabled:opacity-50"><MessageCircle size={18}/>{busy ? 'جارٍ تجهيز الرابط…' : 'إنشاء التقرير وفتح واتساب'}<ArrowUpRight size={16}/></button><p className="mt-3 text-center text-[11px] leading-5 text-zinc-500">سيفتح واتساب برسالة جاهزة؛ راجعها ثم اضغط إرسال بنفسك.</p>
  </div></div>;
}
