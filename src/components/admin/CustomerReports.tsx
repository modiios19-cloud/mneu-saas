import React, { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, doc, getDocs, serverTimestamp, Timestamp, updateDoc } from 'firebase/firestore';
import { ArrowUpRight, CalendarDays, FileBarChart2, MapPin, MessageCircle, Pencil, Phone, Search, X } from 'lucide-react';
import { db } from '../../lib/firebase';
import { RestaurantData } from '../../types/restaurant';
import { buildReportAnalytics } from '../../lib/reportAnalytics';
import { ReportData, ReportPreview } from '../PublicReport';
import { ClientWorkspace, WorkData, WORK_STAGES } from './ClientWorkspace';
import { normalizePhone, whatsappDigits } from '../../lib/phone';

type VenueType = { id: string; labelAr: string };
type Props = { restaurants: RestaurantData[]; venueTypes?: VenueType[]; publicBaseUrl?: string; onToast: (message: string) => void };
const today = () => new Date().toLocaleDateString('en-CA');
const initialStart = () => { const d = new Date(); d.setDate(1); return d.toLocaleDateString('en-CA'); };
const typeName = (type?: string) => type === 'cafe' ? 'مقهى' : type === 'restaurant' ? 'مطعم' : type || 'منشأة';
const phoneDigits = (phone?: string) => (phone || '').replace(/\D/g, '');
const localYemenDigits = (value = '') => value.replace(/\D/g, '').replace(/^(00967|967)/, '').replace(/^0/, '').slice(0, 9);

const DEMO_CUSTOMER_ID = 'demo-customer-back-fries';
const DEMO_CUSTOMER: RestaurantData = {
  id: DEMO_CUSTOMER_ID, slug: 'demo-back-fries', name: 'BACK FRIES',
  logoUrl: 'https://lh3.googleusercontent.com/aida/AEtjO1UYzrwvXqABYl6SLV7TZjhpohEHDAXg90Q2TXIx2bltHCE16e_iuisdpjuy80npzAzXKpz8dT9z1qA-y4BF6q2SYqSuOX7WikA021Kr3U74VlsinNtrepLG7dC3DQBEI4gybJ28cyV2X49VylVCBu6RQ2fmThXCyjolRueW-LuFnW9GhLwQv-_ib9iFFworDt64zvzyTqCUxPKCBPiCW4p1RM9e-IMO_9MkpRK0HrEbJJ1nX41tiAxSgTs',
  primaryColor: '#A33900', currency: 'ر.س', type: 'restaurant', isActive: true,
  businessInfo: 'مطعم وجبات سريعة · عميل افتراضي لمعاينة إدارة العملاء والتقارير',
  client: { name: 'محمد أحمد (عميل افتراضي)', phone: '+967771234567', location: 'صنعاء، اليمن' },
  contact: { phone: '+9671234567', whatsapp: '+9671234567', locationNameAr: 'شارع حدة، صنعاء', maps: 'https://maps.google.com/?q=Sanaa,Yemen' },
  categories: [{ id: 'demo-fries', labelAr: 'البطاطس' }, { id: 'demo-burgers', labelAr: 'البرجر' }],
  products: [
    { id: 'demo-item-1', categoryId: 'demo-fries', nameAr: 'ترافل تشيزي فرايز', descriptionAr: '', price: 32, imageUrl: '' },
    { id: 'demo-item-2', categoryId: 'demo-burgers', nameAr: 'دوبل سماش برجر', descriptionAr: '', price: 42, imageUrl: '' },
  ],
};

export const CustomerReports: React.FC<Props> = ({ restaurants, venueTypes = [], publicBaseUrl, onToast }) => {
  const demoOnly = restaurants.length === 0;
  const [clients, setClients] = useState(restaurants);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<RestaurantData | null>(null);
  const [preview, setPreview] = useState<ReportData | null>(null);
  const [editing, setEditing] = useState<RestaurantData | null>(null);
  const [workspace, setWorkspace] = useState<RestaurantData | null>(null);
  const [workRecords, setWorkRecords] = useState<Record<string, WorkData>>({});
  const [workError, setWorkError] = useState(false);
  useEffect(() => {
    let alive = true;
    getDocs(collection(db, 'clientWorkspace')).then(snap => {
      if (alive) setWorkRecords(Object.fromEntries(snap.docs.map(d => [d.id, d.data() as WorkData])));
    }).catch(() => alive && setWorkError(true));
    return () => { alive = false; };
  }, []);
  useEffect(() => setClients(restaurants), [restaurants]);
  const visibleClients = demoOnly ? [DEMO_CUSTOMER] : clients;
  const filtered = useMemo(() => visibleClients.filter(r => `${r.name} ${r.client?.name || ''} ${r.id} ${r.contact?.phone || ''} ${r.client?.phone || ''}`.toLowerCase().includes(query.toLowerCase())), [visibleClients, query]);
  const venueLabel = (r: RestaurantData) => venueTypes.find(t => t.id === r.type)?.labelAr || typeName(r.type);

  return <section className="space-y-5 text-white">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-sm text-zinc-400">بيانات العميل وصاحب النشاط التجاري وتقاريره</p><h2 className="mt-1 text-2xl font-black">إدارة العملاء</h2></div>
      <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5"><Search size={16} className="text-zinc-400"/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="ابحث بالاسم أو الكود أو الرقم" className="w-64 max-w-full bg-transparent text-sm outline-none"/></label>
    </header>
    {!demoOnly && <section className="rounded-2xl border border-white/10 bg-[#202022] p-4">
      <h3 className="font-black text-amber-300">مراحل العمل والتذكيرات</h3>
      {workError ? <p className="mt-2 text-xs text-red-300">تعذر تحميل مراحل العمل.</p> : <>
        <div className="mt-3 flex flex-wrap gap-2">{WORK_STAGES.map(stage => <span key={stage} className="rounded-lg bg-white/5 px-2 py-1 text-xs">{stage}: {clients.filter(r => (workRecords[r.id]?.stage || 'عميل جديد') === stage).length}</span>)}</div>
        {clients.filter(r => workRecords[r.id]?.reminderDate && workRecords[r.id].reminderDate <= today()).map(r => <button key={r.id} onClick={() => setWorkspace(r)} className="mt-3 ml-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-right text-xs text-amber-100">تذكير: {r.name} · {workRecords[r.id].reminderDate} · {workRecords[r.id].reminderNote || 'متابعة العميل'}</button>)}
      </>}
    </section>}
    {demoOnly && <div className="rounded-xl border border-amber-300/20 bg-amber-300/[0.06] px-4 py-3 text-xs leading-5 text-amber-100"><strong>وضع المعاينة:</strong> هذه بطاقة عميل افتراضي لتجربة شكل البيانات والتقرير. لن تُحفظ بياناته أو يُرسل تقرير حقيقي.</div>}
    <div className="grid gap-4 xl:grid-cols-2">
      {filtered.map(r => {
        const customerPhone = r.client?.phone || '';
        const businessPhone = r.contact?.phone || r.contact?.whatsapp || '';
        const customerDigits = whatsappDigits(customerPhone);
        const businessDigits = whatsappDigits(r.contact?.whatsapp || businessPhone);
        return <article key={r.id} className="overflow-hidden rounded-2xl border border-white/10 bg-[#202022]">
          <div className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[11px] font-bold text-[#F7E354]">بيانات العميل</p><h3 className="truncate text-lg font-extrabold">{r.client?.name || 'اسم العميل غير مسجل'}</h3></div>{!demoOnly && <button onClick={() => setEditing(r)} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-2 text-xs font-bold text-zinc-300 hover:bg-white/5"><Pencil size={13}/> تعديل البيانات</button>}</div>
            <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              <InfoLine icon={<MapPin size={15}/>} label="موقع العميل" value={r.client?.location} href={r.client?.locationUrl}/>
              <InfoLine icon={<FileBarChart2 size={15}/>} label="نشاط العميل" value={`${venueLabel(r)} · كود ${r.id}`}/>
              <div className="flex min-w-0 items-center gap-2 text-zinc-300"><Phone size={15} className="shrink-0 text-zinc-500"/><span className="text-xs text-zinc-500">رقم العميل</span><span className="truncate" dir="ltr">{customerPhone || 'غير مسجل'}</span></div>
              <div className="flex items-center gap-2">
                {customerDigits ? <><a href={`tel:${normalizePhone(customerPhone)}`} className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2.5 py-1.5 text-xs font-bold text-emerald-300"><Phone size={13}/> اتصال</a><a target="_blank" rel="noreferrer" href={`https://wa.me/${customerDigits}`} className="inline-flex items-center gap-1 rounded-lg bg-green-500/10 px-2.5 py-1.5 text-xs font-bold text-green-300"><MessageCircle size={13}/> واتساب</a></> : <span className="text-xs text-amber-200">أضف رقم العميل لتفعيل الاتصال</span>}
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 bg-black/10 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3">{r.logoUrl ? <img src={r.logoUrl} alt={`شعار ${r.name}`} className="h-10 w-10 shrink-0 rounded-xl bg-white/5 object-cover"/> : <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/5 text-zinc-400"><FileBarChart2 size={18}/></div>}<div className="min-w-0"><p className="text-[11px] font-bold text-zinc-500">بيانات النشاط التجاري</p><h4 className="mt-1 truncate font-extrabold">{r.name}</h4><p className="mt-1 text-xs text-zinc-400">{venueLabel(r)}{r.businessInfo ? ` · ${r.businessInfo}` : ''}</p></div></div><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${r.isActive === false ? 'bg-zinc-700 text-zinc-300' : 'bg-emerald-400/10 text-emerald-300'}`}>{r.isActive === false ? 'متوقف' : 'نشط'}</span></div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-400"><InfoLine icon={<MapPin size={14}/>} label="موقع النشاط" value={r.contact?.locationNameAr} href={r.contact?.maps}/><span className="inline-flex items-center gap-1.5"><Phone size={14}/><span dir="ltr">{businessPhone || 'رقم المحل غير مسجل'}</span></span></div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
              <div className="flex gap-2">{businessPhone && <><a href={`tel:${normalizePhone(businessPhone)}`} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-2 text-xs font-bold text-zinc-300"><Phone size={13}/> اتصال بالمحل</a><a target="_blank" rel="noreferrer" href={`https://wa.me/${businessDigits}`} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-2 text-xs font-bold text-zinc-300"><MessageCircle size={13}/> واتساب المحل</a></>}</div>
              {!demoOnly && <button onClick={() => setWorkspace(r)} className="inline-flex items-center gap-2 rounded-xl border border-amber-300/40 px-3 py-2 text-xs font-bold text-amber-300">ملف العمل والتسليم</button>}
              <button onClick={() => setSelected(r)} className="inline-flex items-center gap-2 rounded-xl bg-[#F7E354] px-3 py-2 text-xs font-black text-zinc-900"><FileBarChart2 size={15}/>{demoOnly ? 'معاينة التقرير' : 'إعداد التقرير'}</button>
            </div>
          </div>
        </article>;
      })}
      {!filtered.length && <div className="col-span-full rounded-2xl border border-dashed border-white/15 p-10 text-center text-sm text-zinc-400">لا توجد نتائج مطابقة.</div>}
    </div>
    {workspace && <ClientWorkspace restaurant={workspace} publicBaseUrl={publicBaseUrl} onClose={() => setWorkspace(null)} onUpdated={(id, data) => setWorkRecords(current => ({ ...current, [id]: data }))}/> }
    {editing && <ClientEditor restaurant={editing} onClose={() => setEditing(null)} onToast={onToast} onSave={updated => setClients(current => current.map(r => r.id === updated.id ? updated : r))}/>}
    {selected && <ReportComposer restaurant={selected} onClose={() => setSelected(null)} onToast={onToast} onPreview={setPreview}/>}
    {preview && <ReportPreview report={preview} onClose={() => setPreview(null)}/>}
  </section>;
};

function InfoLine({ icon, label, value, href }: { icon: React.ReactNode; label: string; value?: string; href?: string }) {
  return <div className="flex min-w-0 items-center gap-1.5 text-xs text-zinc-400">{icon}<span className="shrink-0 text-zinc-500">{label}:</span>{value ? href ? <a href={href} target="_blank" rel="noreferrer" className="truncate text-zinc-200 underline decoration-white/20 underline-offset-2">{value}</a> : <span className="truncate text-zinc-200">{value}</span> : <span className="text-zinc-500">غير مسجل</span>}</div>;
}

function ClientEditor({ restaurant, onClose, onToast, onSave }: { restaurant: RestaurantData; onClose: () => void; onToast: (message: string) => void; onSave: (restaurant: RestaurantData) => void }) {
  const [form, setForm] = useState({ clientName: restaurant.client?.name || '', clientPhone: localYemenDigits(restaurant.client?.phone || ''), clientLocation: restaurant.client?.location || '', clientLocationUrl: restaurant.client?.locationUrl || '', businessName: restaurant.name || '', businessType: restaurant.type || 'restaurant', businessInfo: restaurant.businessInfo || '', businessLocation: restaurant.contact?.locationNameAr || '', businessMap: restaurant.contact?.maps || '', businessPhone: restaurant.contact?.phone || '', businessWhatsapp: restaurant.contact?.whatsapp || '' });
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!db) return onToast('قاعدة البيانات غير متاحة');
    const localPhone = localYemenDigits(form.clientPhone);
    if (localPhone && (!localPhone.startsWith('7') || localPhone.length !== 9)) { onToast('أدخل رقمًا يمنيًا من 9 أرقام يبدأ بـ 7'); return; }
    setSaving(true);
    const updated: RestaurantData = { ...restaurant, name: form.businessName.trim(), type: form.businessType, client: { name: form.clientName.trim(), phone: localPhone ? `+967${localPhone}` : '', location: form.clientLocation.trim(), locationUrl: form.clientLocationUrl.trim() }, businessInfo: form.businessInfo.trim(), contact: { ...restaurant.contact, phone: form.businessPhone.trim(), whatsapp: form.businessWhatsapp.trim(), locationNameAr: form.businessLocation.trim(), maps: form.businessMap.trim() } };
    try { await updateDoc(doc(db, 'restaurants', restaurant.id), { name: updated.name, type: updated.type, client: updated.client, businessInfo: updated.businessInfo, contact: updated.contact }); onSave(updated); onToast('تم حفظ بيانات العميل والنشاط'); onClose(); }
    catch (error) { console.error(error); onToast('تعذر حفظ البيانات. تحقق من قواعد Firestore.'); }
    finally { setSaving(false); }
  };
  const field = (label: string, key: keyof typeof form, placeholder = '') => <label className="block text-xs font-bold text-zinc-300">{label}{key === 'clientPhone' ? <span className="mt-1.5 flex w-full overflow-hidden rounded-xl border border-white/10 bg-[#111] focus-within:border-[#F7E354]" dir="ltr"><span className="flex select-none items-center border-r border-white/10 px-3 text-sm font-bold text-[#F7E354]" aria-label="مفتاح اليمن ثابت">+967</span><input type="tel" inputMode="numeric" maxLength={9} value={form.clientPhone} onChange={e => setForm(current => ({ ...current, clientPhone: localYemenDigits(e.target.value) }))} placeholder={placeholder || '7xxxxxxxx'} className="min-w-0 flex-1 bg-transparent p-3 text-sm text-white outline-none"/></span> : <input type={key.toLowerCase().includes('phone') || key === 'businessWhatsapp' ? 'tel' : 'text'} dir={key.toLowerCase().includes('phone') || key === 'businessWhatsapp' ? 'ltr' : undefined} value={form[key]} onChange={e => setForm(current => ({ ...current, [key]: e.target.value }))} placeholder={placeholder} className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#111] p-3 text-sm text-white outline-none focus:border-[#F7E354]"/>}</label>;
  return <div className="fixed inset-0 z-[121] grid place-items-center bg-black/75 p-3 sm:p-6"><div className="max-h-[92vh] w-full max-w-2xl overflow-auto rounded-3xl border border-white/10 bg-[#1c1c1e] p-5 sm:p-7"><div className="flex items-start justify-between"><div><span className="text-xs font-bold text-[#F7E354]">ملف العميل والنشاط</span><h3 className="mt-1 text-xl font-black">{restaurant.name}</h3></div><button onClick={onClose} className="rounded-lg p-2 text-zinc-400 hover:bg-white/10"><X size={19}/></button></div>
    <h4 className="mt-5 border-b border-white/10 pb-2 text-sm font-black">بيانات العميل</h4><div className="mt-3 grid gap-3 sm:grid-cols-2">{field('رقم واتساب العميل', 'clientPhone', '7xxxxxxxx')}{field('اسم العميل', 'clientName', 'اسم صاحب النشاط')}{field('موقع العميل', 'clientLocation', 'المدينة أو المنطقة')}{field('رابط موقع العميل (اختياري)', 'clientLocationUrl', 'رابط خرائط')}</div>
    <h4 className="mt-6 border-b border-white/10 pb-2 text-sm font-black">بيانات النشاط التجاري</h4><div className="mt-3 grid gap-3 sm:grid-cols-2">{field('اسم النشاط', 'businessName')}{field('نوع النشاط', 'businessType', 'مطعم، مقهى، ...')}{field('معلومات النشاط', 'businessInfo', 'وصف مختصر للنشاط')}{field('موقع النشاط', 'businessLocation', 'المدينة أو العنوان')}{field('رابط خرائط النشاط', 'businessMap', 'رابط خرائط Google')}{field('رقم المحل', 'businessPhone', '+967...')}{field('واتساب المحل', 'businessWhatsapp', '+967...')}</div>
    <div className="mt-5 flex justify-end gap-2"><button onClick={onClose} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm">إلغاء</button><button disabled={saving} onClick={save} className="rounded-xl bg-[#F7E354] px-5 py-2.5 text-sm font-black text-zinc-900 disabled:opacity-50">{saving ? 'جارٍ الحفظ…' : 'حفظ البيانات'}</button></div>
  </div></div>;
}

function ReportComposer({ restaurant, onClose, onToast, onPreview }: { restaurant: RestaurantData; onClose: () => void; onToast: (message: string) => void; onPreview: (report: ReportData) => void }) {
  const isDemo = restaurant.id === DEMO_CUSTOMER_ID;
  const [startDate, setStartDate] = useState(initialStart);
  const [endDate, setEndDate] = useState(today);
  const [customMessage, setCustomMessage] = useState('مرحباً {name}، تقرير نشاط منيو {restaurant} للفترة من {start} إلى {end}: {url}');
  const [includeStatus, setIncludeStatus] = useState(true);
  const [busy, setBusy] = useState(false);
  const metrics = useMemo(() => buildReportAnalytics(restaurant.id, startDate, endDate), [restaurant.id, startDate, endDate]);
  const customerPhone = restaurant.client?.phone || '';
  const chooseRange = (kind: 'week' | 'month') => { const d = new Date(); if (kind === 'week') d.setDate(d.getDate() - 6); else d.setDate(1); setStartDate(d.toLocaleDateString('en-CA')); setEndDate(today()); };
  const reportData: ReportData = {
    metricsKind: 'sample',
    restaurant: { id: restaurant.id, name: restaurant.name, type: restaurant.type || 'restaurant', logoUrl: restaurant.logoUrl || '', currency: restaurant.currency || 'ر.س' },
    clientName: restaurant.client?.name || restaurant.name,
    period: { startDate, endDate }, sections: { status: includeStatus }, metrics,
    status: includeStatus ? { active: restaurant.isActive !== false, generatedAt: new Date().toISOString() } : undefined
  };
  const send = async () => {
    if (!db) { onToast('اتصال قاعدة البيانات غير متاح'); return; }
    if (!customerPhone) { onToast('أضف رقم العميل أولًا من تعديل البيانات'); return; }
    if (!startDate || !endDate || startDate > endDate) { onToast('تحقق من تاريخ بداية ونهاية الفترة'); return; }
    const whatsappWindow = window.open('', '_blank');
    if (!whatsappWindow) { onToast('اسمح بفتح النوافذ المنبثقة لإكمال الإرسال'); return; }
    setBusy(true);
    try {
      const ref = await addDoc(collection(db, 'publicReports'), {
        metricsKind: 'sample',
        restaurant: { id: restaurant.id, name: restaurant.name, type: restaurant.type || 'restaurant', logoUrl: restaurant.logoUrl || '', currency: restaurant.currency || 'ر.س' },
        clientName: restaurant.client?.name || restaurant.name,
        period: { startDate, endDate }, sections: { status: includeStatus }, metrics,
        status: reportData.status || null,
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
    <div className="mt-5 grid grid-cols-2 gap-3"><label className="text-xs font-bold text-zinc-300">من<input type="date" value={startDate} max={endDate} onChange={e => setStartDate(e.target.value)} className="mt-2 block w-full rounded-xl border border-white/10 bg-[#111] p-3 text-sm text-white"/></label><label className="text-xs font-bold text-zinc-300">إلى<input type="date" value={endDate} min={startDate} max={today()} onChange={e => setEndDate(e.target.value)} className="mt-2 block w-full rounded-xl border border-white/10 bg-[#111] p-3 text-sm text-white"/></label></div>
    <div className="mt-3 flex gap-2"><button onClick={() => chooseRange('week')} className="rounded-lg bg-white/5 px-3 py-2 text-xs">آخر 7 أيام</button><button onClick={() => chooseRange('month')} className="rounded-lg bg-white/5 px-3 py-2 text-xs">هذا الشهر</button><span className="inline-flex items-center gap-1 text-xs text-zinc-500"><CalendarDays size={14}/> أو حدد فترة مخصصة</span></div>
    <div className="mt-5 rounded-2xl border border-[#F7E354]/20 bg-[#F7E354]/[0.05] p-4"><div className="flex items-center justify-between gap-2"><p className="text-sm font-black text-[#F7E354]">إحصاءات الفترة المحددة</p><span className="text-[10px] text-amber-100/70">تجريبية · تُحسب تلقائيًا حسب التاريخ</span></div><div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">{[['ماسحو QR', metrics.qrScans], ['زيارات الرابط', metrics.linkVisits], ['زيارات المشاركة', metrics.shareVisits], ['إجمالي الزيارات', metrics.totalVisits]].map(([label, value]) => <div key={String(label)} className="rounded-xl bg-black/20 p-3"><p className="text-[10px] text-zinc-400">{label}</p><p className="mt-1 font-black text-white">{Number(value).toLocaleString('ar')}</p></div>)}</div><p className="mt-3 text-[11px] leading-5 text-zinc-400">الأرقام نموذجية قبل الإطلاق، وتُعاد حسابها تلقائيًا عند تغيير الفترة. الإيرادات غير معروضة لعدم وجود نظام مبيعات أو طلبات في التطبيق.</p></div>
    <div className="mt-4 space-y-3"><p className="text-xs font-bold text-zinc-300">محتويات التقرير</p><label className="flex gap-2 text-sm"><input type="checkbox" checked={includeStatus} onChange={e => setIncludeStatus(e.target.checked)}/>حالة المنيو وقت إنشاء التقرير</label></div>
    <label className="mt-5 block text-xs font-bold text-zinc-300">نص رسالة واتساب <span className="font-normal text-zinc-500">(المتغيرات: {'{name}'}, {'{start}'}, {'{end}'}, {'{url}'})</span><textarea rows={3} value={customMessage} onChange={e => setCustomMessage(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#111] p-3 text-sm leading-6 text-white outline-none focus:border-[#F7E354]"/></label>
    <button onClick={() => onPreview(reportData)} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 py-3 font-bold text-white"><FileBarChart2 size={18}/>معاينة التقرير كما سيراه العميل</button>
    {!isDemo && <><button disabled={busy} onClick={send} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#F7E354] py-3 font-black text-zinc-900 disabled:opacity-50"><MessageCircle size={18}/>{busy ? 'جارٍ تجهيز الرابط…' : 'إنشاء التقرير وفتح واتساب'}<ArrowUpRight size={16}/></button><p className="mt-3 text-center text-[11px] leading-5 text-zinc-500">سيُفتح واتساب على رقم العميل؛ راجع الرسالة ثم أرسلها بنفسك.</p></>}
    {isDemo && <p className="mt-3 text-center text-[11px] leading-5 text-amber-200">هذا عميل افتراضي؛ استخدم المعاينة فقط. لن يُنشأ رابط أو تُفتح محادثة واتساب.</p>}
  </div></div>;
}
