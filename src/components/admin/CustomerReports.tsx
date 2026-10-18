import React, { useMemo, useState } from 'react';
import { addDoc, collection, doc, serverTimestamp, Timestamp, updateDoc } from 'firebase/firestore';
import { ArrowUpRight, CalendarDays, FileBarChart2, MapPin, MessageCircle, Pencil, Phone, Search, X } from 'lucide-react';
import { db } from '../../lib/firebase';
import { RestaurantData } from '../../types/restaurant';

type VenueType = { id: string; labelAr: string };
type Props = { restaurants: RestaurantData[]; venueTypes?: VenueType[]; onToast: (message: string) => void };
type MetricsDraft = { qrScans: number; linkVisits: number; shareVisits: number; orders: number; revenue: number; topCategory: string; topItem: string };
const today = () => new Date().toLocaleDateString('en-CA');
const initialStart = () => { const d = new Date(); d.setDate(1); return d.toLocaleDateString('en-CA'); };
const typeName = (type?: string) => type === 'cafe' ? 'مقهى' : type === 'restaurant' ? 'مطعم' : type || 'منشأة';
const phoneDigits = (phone?: string) => (phone || '').replace(/\D/g, '');
const demoMetrics = (id: string): MetricsDraft => {
  const seed = [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return { qrScans: 780 + (seed % 730), linkVisits: 420 + (seed % 510), shareVisits: 160 + (seed % 340), orders: 86 + (seed % 115), revenue: 2400 + (seed % 3900), topCategory: '', topItem: '' };
};

export const CustomerReports: React.FC<Props> = ({ restaurants, venueTypes = [], onToast }) => {
  const [clients, setClients] = useState(restaurants);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<RestaurantData | null>(null);
  const [editing, setEditing] = useState<RestaurantData | null>(null);
  const filtered = useMemo(() => clients.filter(r => `${r.name} ${r.client?.name || ''} ${r.id} ${r.contact?.phone || ''} ${r.client?.phone || ''}`.toLowerCase().includes(query.toLowerCase())), [clients, query]);
  const venueLabel = (r: RestaurantData) => venueTypes.find(t => t.id === r.type)?.labelAr || typeName(r.type);

  return <section className="space-y-5 text-white">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-sm text-zinc-400">بيانات العميل وصاحب النشاط التجاري وتقاريره</p><h2 className="mt-1 text-2xl font-black">إدارة العملاء</h2></div>
      <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5"><Search size={16} className="text-zinc-400"/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="ابحث بالاسم أو الكود أو الرقم" className="w-64 max-w-full bg-transparent text-sm outline-none"/></label>
    </header>
    <div className="grid gap-4 xl:grid-cols-2">
      {filtered.map(r => {
        const customerPhone = r.client?.phone || '';
        const businessPhone = r.contact?.phone || r.contact?.whatsapp || '';
        const customerDigits = phoneDigits(customerPhone);
        const businessDigits = phoneDigits(r.contact?.whatsapp || businessPhone);
        return <article key={r.id} className="overflow-hidden rounded-2xl border border-white/10 bg-[#202022]">
          <div className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#F7E354] text-zinc-900"><span className="font-black">{(r.client?.name || 'ع').slice(0, 1)}</span></div><div className="min-w-0"><p className="text-[11px] font-bold text-[#F7E354]">بيانات العميل</p><h3 className="truncate text-lg font-extrabold">{r.client?.name || 'اسم العميل غير مسجل'}</h3></div></div><button onClick={() => setEditing(r)} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-2 text-xs font-bold text-zinc-300 hover:bg-white/5"><Pencil size={13}/> تعديل البيانات</button></div>
            <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              <InfoLine icon={<MapPin size={15}/>} label="موقع العميل" value={r.client?.location} href={r.client?.locationUrl}/>
              <InfoLine icon={<FileBarChart2 size={15}/>} label="نشاط العميل" value={`${venueLabel(r)} · كود ${r.id}`}/>
              <div className="flex min-w-0 items-center gap-2 text-zinc-300"><Phone size={15} className="shrink-0 text-zinc-500"/><span className="text-xs text-zinc-500">رقم العميل</span><span className="truncate" dir="ltr">{customerPhone || 'غير مسجل'}</span></div>
              <div className="flex items-center gap-2">
                {customerDigits ? <><a href={`tel:${customerPhone}`} className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2.5 py-1.5 text-xs font-bold text-emerald-300"><Phone size={13}/> اتصال</a><a target="_blank" rel="noreferrer" href={`https://wa.me/${customerDigits}`} className="inline-flex items-center gap-1 rounded-lg bg-green-500/10 px-2.5 py-1.5 text-xs font-bold text-green-300"><MessageCircle size={13}/> واتساب</a></> : <span className="text-xs text-amber-200">أضف رقم العميل لتفعيل الاتصال</span>}
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 bg-black/10 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[11px] font-bold text-zinc-500">بيانات النشاط التجاري</p><h4 className="mt-1 truncate font-extrabold">{r.name}</h4><p className="mt-1 text-xs text-zinc-400">{venueLabel(r)}{r.businessInfo ? ` · ${r.businessInfo}` : ''}</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${r.isActive === false ? 'bg-zinc-700 text-zinc-300' : 'bg-emerald-400/10 text-emerald-300'}`}>{r.isActive === false ? 'متوقف' : 'نشط'}</span></div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-400"><InfoLine icon={<MapPin size={14}/>} label="موقع النشاط" value={r.contact?.locationNameAr} href={r.contact?.maps}/><span className="inline-flex items-center gap-1.5"><Phone size={14}/><span dir="ltr">{businessPhone || 'رقم المحل غير مسجل'}</span></span></div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
              <div className="flex gap-2">{businessPhone && <><a href={`tel:${businessPhone}`} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-2 text-xs font-bold text-zinc-300"><Phone size={13}/> اتصال بالمحل</a><a target="_blank" rel="noreferrer" href={`https://wa.me/${businessDigits}`} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-2 text-xs font-bold text-zinc-300"><MessageCircle size={13}/> واتساب المحل</a></>}</div>
              <button onClick={() => setSelected(r)} className="inline-flex items-center gap-2 rounded-xl bg-[#F7E354] px-3 py-2 text-xs font-black text-zinc-900"><FileBarChart2 size={15}/> إعداد التقرير</button>
            </div>
          </div>
        </article>;
      })}
      {!filtered.length && <div className="col-span-full rounded-2xl border border-dashed border-white/15 p-10 text-center text-sm text-zinc-400">لا توجد نتائج مطابقة.</div>}
    </div>
    {editing && <ClientEditor restaurant={editing} onClose={() => setEditing(null)} onToast={onToast} onSave={updated => setClients(current => current.map(r => r.id === updated.id ? updated : r))}/>}
    {selected && <ReportComposer restaurant={selected} onClose={() => setSelected(null)} onToast={onToast}/>}
  </section>;
};

function InfoLine({ icon, label, value, href }: { icon: React.ReactNode; label: string; value?: string; href?: string }) {
  return <div className="flex min-w-0 items-center gap-1.5 text-xs text-zinc-400">{icon}<span className="shrink-0 text-zinc-500">{label}:</span>{value ? href ? <a href={href} target="_blank" rel="noreferrer" className="truncate text-zinc-200 underline decoration-white/20 underline-offset-2">{value}</a> : <span className="truncate text-zinc-200">{value}</span> : <span className="text-zinc-500">غير مسجل</span>}</div>;
}

function ClientEditor({ restaurant, onClose, onToast, onSave }: { restaurant: RestaurantData; onClose: () => void; onToast: (message: string) => void; onSave: (restaurant: RestaurantData) => void }) {
  const [form, setForm] = useState({ clientName: restaurant.client?.name || '', clientPhone: restaurant.client?.phone || '', clientLocation: restaurant.client?.location || '', clientLocationUrl: restaurant.client?.locationUrl || '', businessName: restaurant.name || '', businessType: restaurant.type || 'restaurant', businessInfo: restaurant.businessInfo || '', businessLocation: restaurant.contact?.locationNameAr || '', businessMap: restaurant.contact?.maps || '', businessPhone: restaurant.contact?.phone || '', businessWhatsapp: restaurant.contact?.whatsapp || '' });
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!db) return onToast('قاعدة البيانات غير متاحة');
    setSaving(true);
    const updated: RestaurantData = { ...restaurant, name: form.businessName.trim(), type: form.businessType, client: { name: form.clientName.trim(), phone: form.clientPhone.trim(), location: form.clientLocation.trim(), locationUrl: form.clientLocationUrl.trim() }, businessInfo: form.businessInfo.trim(), contact: { ...restaurant.contact, phone: form.businessPhone.trim(), whatsapp: form.businessWhatsapp.trim(), locationNameAr: form.businessLocation.trim(), maps: form.businessMap.trim() } };
    try { await updateDoc(doc(db, 'restaurants', restaurant.id), { name: updated.name, type: updated.type, client: updated.client, businessInfo: updated.businessInfo, contact: updated.contact }); onSave(updated); onToast('تم حفظ بيانات العميل والنشاط'); onClose(); }
    catch (error) { console.error(error); onToast('تعذر حفظ البيانات. تحقق من قواعد Firestore.'); }
    finally { setSaving(false); }
  };
  const field = (label: string, key: keyof typeof form, placeholder = '') => <label className="block text-xs font-bold text-zinc-300">{label}<input value={form[key]} onChange={e => setForm(current => ({ ...current, [key]: e.target.value }))} placeholder={placeholder} className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#111] p-3 text-sm text-white outline-none focus:border-[#F7E354]"/></label>;
  return <div className="fixed inset-0 z-[121] grid place-items-center bg-black/75 p-3 sm:p-6"><div className="max-h-[92vh] w-full max-w-2xl overflow-auto rounded-3xl border border-white/10 bg-[#1c1c1e] p-5 sm:p-7"><div className="flex items-start justify-between"><div><span className="text-xs font-bold text-[#F7E354]">ملف العميل والنشاط</span><h3 className="mt-1 text-xl font-black">{restaurant.name}</h3></div><button onClick={onClose} className="rounded-lg p-2 text-zinc-400 hover:bg-white/10"><X size={19}/></button></div>
    <h4 className="mt-5 border-b border-white/10 pb-2 text-sm font-black">بيانات العميل</h4><div className="mt-3 grid gap-3 sm:grid-cols-2">{field('اسم العميل', 'clientName', 'اسم صاحب النشاط')}{field('رقم العميل للاتصال وواتساب', 'clientPhone', '+967...')}{field('موقع العميل', 'clientLocation', 'المدينة أو المنطقة')}{field('رابط موقع العميل (اختياري)', 'clientLocationUrl', 'رابط خرائط')}</div>
    <h4 className="mt-6 border-b border-white/10 pb-2 text-sm font-black">بيانات النشاط التجاري</h4><div className="mt-3 grid gap-3 sm:grid-cols-2">{field('اسم النشاط', 'businessName')}{field('نوع النشاط', 'businessType', 'مطعم، مقهى، ...')}{field('معلومات النشاط', 'businessInfo', 'وصف مختصر للنشاط')}{field('موقع النشاط', 'businessLocation', 'المدينة أو العنوان')}{field('رابط خرائط النشاط', 'businessMap', 'رابط خرائط Google')}{field('رقم المحل', 'businessPhone', '+967...')}{field('واتساب المحل', 'businessWhatsapp', '+967...')}</div>
    <div className="mt-5 flex justify-end gap-2"><button onClick={onClose} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm">إلغاء</button><button disabled={saving} onClick={save} className="rounded-xl bg-[#F7E354] px-5 py-2.5 text-sm font-black text-zinc-900 disabled:opacity-50">{saving ? 'جارٍ الحفظ…' : 'حفظ البيانات'}</button></div>
  </div></div>;
}

function ReportComposer({ restaurant, onClose, onToast }: { restaurant: RestaurantData; onClose: () => void; onToast: (message: string) => void }) {
  const [startDate, setStartDate] = useState(initialStart);
  const [endDate, setEndDate] = useState(today);
  const [customMessage, setCustomMessage] = useState('مرحباً {name}، تقرير نشاط منيو {restaurant} للفترة من {start} إلى {end}: {url}');
  const [includeMenu, setIncludeMenu] = useState(true);
  const [includeStatus, setIncludeStatus] = useState(true);
  const [metrics, setMetrics] = useState<MetricsDraft>(() => demoMetrics(restaurant.id));
  const [busy, setBusy] = useState(false);
  const customerPhone = restaurant.client?.phone || '';
  const chooseRange = (kind: 'week' | 'month') => { const d = new Date(); if (kind === 'week') d.setDate(d.getDate() - 6); else d.setDate(1); setStartDate(d.toLocaleDateString('en-CA')); setEndDate(today()); };
  const numeric = (label: string, key: 'qrScans' | 'linkVisits' | 'shareVisits' | 'orders' | 'revenue') => <label className="block text-xs font-bold text-zinc-300">{label}<input type="number" min="0" value={metrics[key]} onChange={e => setMetrics(current => ({ ...current, [key]: Number(e.target.value) }))} className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#111] p-3 text-sm text-white"/></label>;
  const textMetric = (label: string, key: 'topCategory' | 'topItem') => <label className="block text-xs font-bold text-zinc-300">{label}<input value={metrics[key]} onChange={e => setMetrics(current => ({ ...current, [key]: e.target.value }))} placeholder="اكتب القيمة أو اتركها فارغة" className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#111] p-3 text-sm text-white"/></label>;
  const send = async () => {
    if (!db) { onToast('اتصال قاعدة البيانات غير متاح'); return; }
    if (!customerPhone) { onToast('أضف رقم العميل أولًا من تعديل البيانات'); return; }
    if (!startDate || !endDate || startDate > endDate) { onToast('تحقق من تاريخ بداية ونهاية الفترة'); return; }
    const whatsappWindow = window.open('', '_blank');
    if (!whatsappWindow) { onToast('اسمح بفتح النوافذ المنبثقة لإكمال الإرسال'); return; }
    setBusy(true);
    try {
      const ref = await addDoc(collection(db, 'publicReports'), {
        restaurant: { id: restaurant.id, name: restaurant.name, type: restaurant.type || 'restaurant', logoUrl: restaurant.logoUrl || '', currency: restaurant.currency || 'ر.س' },
        clientName: restaurant.client?.name || restaurant.name,
        period: { startDate, endDate }, sections: { menu: includeMenu, status: includeStatus },
        metrics: { ...metrics, totalVisits: metrics.qrScans + metrics.linkVisits + metrics.shareVisits },
        menu: includeMenu ? { categories: (restaurant.categories || []).map(c => ({ name: c.labelAr || c.name || c.id, itemCount: restaurant.products.filter(p => p.categoryId === c.id).length })), productCount: restaurant.products.length, activeProductCount: restaurant.products.filter(p => !p.isSoldOut).length } : null,
        status: includeStatus ? { active: restaurant.isActive !== false, generatedAt: new Date().toISOString() } : null,
        createdAt: serverTimestamp(), expiresAt: Timestamp.fromDate(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000))
      });
      const url = new URL(window.location.href); url.search = ''; url.searchParams.set('report', ref.id);
      const reportUrl = url.toString();
      const message = customMessage.replaceAll('{name}', restaurant.client?.name || restaurant.name).replaceAll('{restaurant}', restaurant.name).replaceAll('{start}', startDate).replaceAll('{end}', endDate).replaceAll('{url}', reportUrl);
      const digits = phoneDigits(customerPhone);
      if (!digits) throw new Error('رقم العميل غير صالح');
      whatsappWindow.location.href = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
      onToast('تم تجهيز التقرير وفتح محادثة العميل لمراجعة الرسالة وإرسالها'); onClose();
    } catch (error) { whatsappWindow.close(); console.error(error); onToast('تعذر إنشاء التقرير. تحقق من نشر قواعد Firestore الجديدة.'); }
    finally { setBusy(false); }
  };
  return <div className="fixed inset-0 z-[120] grid place-items-center bg-black/75 p-3 sm:p-6" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><div className="max-h-[92vh] w-full max-w-2xl overflow-auto rounded-3xl border border-white/10 bg-[#1c1c1e] p-5 shadow-2xl sm:p-7">
    <div className="flex items-start justify-between"><div><span className="text-xs font-bold text-[#F7E354]">تقرير العميل · {restaurant.client?.name || restaurant.name}</span><h3 className="mt-1 text-xl font-black">{restaurant.name}</h3></div><button onClick={onClose} className="rounded-lg p-2 text-zinc-400 hover:bg-white/10"><X size={19}/></button></div>
    <div className="mt-5 grid grid-cols-2 gap-3"><label className="text-xs font-bold text-zinc-300">من<input type="date" value={startDate} max={endDate} onChange={e => setStartDate(e.target.value)} className="mt-2 block w-full rounded-xl border border-white/10 bg-[#111] p-3 text-sm text-white"/></label><label className="text-xs font-bold text-zinc-300">إلى<input type="date" value={endDate} max={today()} onChange={e => setEndDate(e.target.value)} className="mt-2 block w-full rounded-xl border border-white/10 bg-[#111] p-3 text-sm text-white"/></label></div>
    <div className="mt-3 flex gap-2"><button onClick={() => chooseRange('week')} className="rounded-lg bg-white/5 px-3 py-2 text-xs">آخر 7 أيام</button><button onClick={() => chooseRange('month')} className="rounded-lg bg-white/5 px-3 py-2 text-xs">هذا الشهر</button><span className="inline-flex items-center gap-1 text-xs text-zinc-500"><CalendarDays size={14}/> أو حدد فترة مخصصة</span></div>
    <div className="mt-5 rounded-2xl border border-[#F7E354]/20 bg-[#F7E354]/[0.05] p-4"><div className="flex items-center justify-between gap-2"><p className="text-sm font-black text-[#F7E354]">الإحصاءات والأرقام</p><span className="text-[10px] text-amber-100/70">قيم تجريبية قابلة للتعديل قبل الإرسال</span></div><div className="mt-3 grid gap-3 sm:grid-cols-2">{numeric('عدد ماسحي QR', 'qrScans')}{numeric('زيارات رابط المنيو', 'linkVisits')}{numeric('زيارات من المشاركة', 'shareVisits')}{numeric('عدد الطلبات', 'orders')}{numeric('الإيرادات', 'revenue')}</div><p className="mt-3 rounded-xl bg-black/20 p-3 text-xs text-zinc-300">إجمالي الزيارات: <b className="text-white">{(metrics.qrScans + metrics.linkVisits + metrics.shareVisits).toLocaleString('ar')}</b> (مجموع المصادر الثلاثة)</p><div className="mt-3 grid gap-3 sm:grid-cols-2">{textMetric('أكثر قسم نشاطًا (اختياري)', 'topCategory')}{textMetric('أكثر صنف نشاطًا (اختياري)', 'topItem')}</div></div>
    <div className="mt-4 space-y-3"><p className="text-xs font-bold text-zinc-300">محتويات التقرير</p><label className="flex gap-2 text-sm"><input type="checkbox" checked={includeMenu} onChange={e => setIncludeMenu(e.target.checked)}/>ملخص المنيو والأقسام والأصناف</label><label className="flex gap-2 text-sm"><input type="checkbox" checked={includeStatus} onChange={e => setIncludeStatus(e.target.checked)}/>حالة المنيو وقت إنشاء التقرير</label></div>
    <label className="mt-5 block text-xs font-bold text-zinc-300">نص رسالة واتساب <span className="font-normal text-zinc-500">(المتغيرات: {'{name}'}, {'{start}'}, {'{end}'}, {'{url}'})</span><textarea rows={3} value={customMessage} onChange={e => setCustomMessage(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#111] p-3 text-sm leading-6 text-white outline-none focus:border-[#F7E354]"/></label>
    <button disabled={busy} onClick={send} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#F7E354] py-3 font-black text-zinc-900 disabled:opacity-50"><MessageCircle size={18}/>{busy ? 'جارٍ تجهيز الرابط…' : 'إنشاء التقرير وفتح واتساب'}<ArrowUpRight size={16}/></button><p className="mt-3 text-center text-[11px] leading-5 text-zinc-500">سيُفتح واتساب على رقم العميل؛ راجع الرسالة ثم أرسلها بنفسك.</p>
  </div></div>;
}
