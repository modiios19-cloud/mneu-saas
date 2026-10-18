import React, { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { BarChart3, CalendarDays, CheckCircle2, FileText, Utensils, X } from 'lucide-react';
import { db } from '../lib/firebase';
import { DailyReportStat } from '../lib/reportAnalytics';

export type ReportData = {
  restaurant: { id?: string; name: string; type?: string; logoUrl?: string; currency?: string };
  clientName?: string;
  period: { startDate: string; endDate: string };
  sections: { menu: boolean; status: boolean };
  metrics: { qrScans: number; linkVisits: number; shareVisits: number; totalVisits: number; daily: DailyReportStat[] };
  menu?: { categories: { name: string; itemCount: number }[]; productCount: number; activeProductCount: number };
  status?: { active: boolean; generatedAt: string };
};

const date = (s: string) => new Date(`${s}T12:00:00`).toLocaleDateString('ar', { year: 'numeric', month: 'long', day: 'numeric' });
const number = (value: number) => value.toLocaleString('ar');

export const PublicReport: React.FC<{ token: string }> = ({ token }) => {
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    let alive = true;
    getDoc(doc(db, 'publicReports', token)).then(snap => { if (alive && snap.exists()) setReport(snap.data() as ReportData); else if (alive) setError(true); })
      .catch(() => alive && setError(true)).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [token]);
  if (loading) return <main dir="rtl" className="grid min-h-screen place-items-center bg-[#f5f5f2] p-5"><div className="rounded-3xl bg-white p-8 text-center text-zinc-500 shadow-sm">جارٍ تحميل التقرير…</div></main>;
  if (error || !report) return <main dir="rtl" className="grid min-h-screen place-items-center bg-[#f5f5f2] p-5"><div className="rounded-3xl bg-white p-8 text-center shadow-sm"><FileText className="mx-auto text-zinc-400"/><h1 className="mt-3 text-xl font-black">الرابط غير متاح</h1><p className="mt-2 text-sm text-zinc-500">قد يكون التقرير غير موجود أو انتهت صلاحيته.</p></div></main>;
  return <ReportPage report={report}/>;
};

export const ReportPreview: React.FC<{ report: ReportData; onClose: () => void }> = ({ report, onClose }) => <div className="fixed inset-0 z-[140] bg-black/80 p-2 sm:p-6"><div className="mx-auto flex h-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-[#f5f5f2] shadow-2xl"><div dir="rtl" className="flex shrink-0 items-center justify-between bg-[#1c1c1e] px-4 py-3 text-white"><div><p className="text-[10px] font-bold text-[#F7E354]">معاينة كما ستظهر للعميل</p><p className="text-sm font-bold">تقرير {report.restaurant.name}</p></div><button onClick={onClose} className="rounded-lg p-2 text-zinc-300 hover:bg-white/10"><X size={19}/><span className="sr-only">العودة للتعديل</span></button></div><div className="min-h-0 flex-1 overflow-y-auto"><ReportPage report={report}/></div></div></div>;

function ReportPage({ report }: { report: ReportData }) {
  const maxDaily = Math.max(1, ...report.metrics.daily.map(row => row.totalVisits));
  return <main dir="rtl" className="min-h-screen bg-[#f5f5f2] px-4 py-7 text-[#181818] sm:px-6 sm:py-12"><div className="mx-auto max-w-2xl">
    <header className="overflow-hidden rounded-[28px] bg-[#1c1c1e] p-6 text-white shadow-xl sm:p-9"><div className="flex items-center gap-3">{report.restaurant.logoUrl ? <img src={report.restaurant.logoUrl} alt={`شعار ${report.restaurant.name}`} className="h-12 w-12 rounded-2xl object-cover"/> : <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#F7E354] text-zinc-900"><Utensils/></div>}<div><p className="text-xs font-bold text-[#F7E354]">تقرير نشاط المنيو</p><h1 className="mt-1 text-xl font-black sm:text-2xl">{report.restaurant.name}</h1><p className="mt-1 text-xs text-zinc-400">إلى: {report.clientName || report.restaurant.name}</p></div></div><div className="mt-6 flex items-center gap-2 rounded-2xl bg-white/5 px-4 py-3 text-sm text-zinc-200"><CalendarDays size={17} className="shrink-0 text-[#F7E354]"/><span>{date(report.period.startDate)} — {date(report.period.endDate)}</span></div><p className="mt-4 text-xs text-zinc-500">تقرير للقراءة فقط · أُعدّ بواسطة إدارة المنصة</p></header>
    <section className="mt-4 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7"><div className="flex items-center gap-2"><BarChart3 className="text-[#927d00]" size={20}/><h2 className="font-black">الزيارات خلال الفترة</h2></div><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{[['ماسحو QR', report.metrics.qrScans], ['زيارات رابط المنيو', report.metrics.linkVisits], ['زيارات المشاركة', report.metrics.shareVisits], ['إجمالي الزيارات', report.metrics.totalVisits]].map(([label, value]) => <div key={String(label)} className="rounded-2xl bg-[#f6f6f3] p-4"><p className="text-[11px] leading-4 text-zinc-500">{label}</p><p className="mt-2 text-xl font-black">{number(Number(value))}</p></div>)}</div>
      {report.metrics.daily.length > 1 && <div className="mt-6"><div className="mb-2 flex justify-between text-[11px] text-zinc-500"><span>الحركة اليومية</span><span>عدد الزيارات</span></div><div className="overflow-x-auto rounded-2xl bg-[#f6f6f3] p-3"><div className="flex h-32 min-w-max items-end gap-1.5">{report.metrics.daily.map((row, index) => <div key={row.date} title={`${date(row.date)}: ${number(row.totalVisits)} زيارة`} className="flex h-full w-5 flex-col items-center justify-end gap-1"><div className="w-full rounded-t-md bg-[#dbc635]" style={{ height: `${Math.max(4, (row.totalVisits / maxDaily) * 100)}%` }}/><span className="text-[8px] text-zinc-400">{index === 0 || index === report.metrics.daily.length - 1 || index % 7 === 0 ? new Date(`${row.date}T12:00:00`).getDate() : ''}</span></div>)}</div></div><div className="mt-1 flex justify-between text-[10px] text-zinc-400"><span>{date(report.metrics.daily[0].date)}</span><span>{date(report.metrics.daily[report.metrics.daily.length - 1].date)}</span></div></div>}
    </section>
    {report.sections.menu && report.menu && <section className="mt-4 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7"><div className="flex items-center gap-2"><Utensils size={19} className="text-[#927d00]"/><h2 className="font-black">لقطة المنيو عند إعداد التقرير</h2></div><div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-[#f6f6f3] p-4"><p className="text-xs text-zinc-500">إجمالي الأصناف</p><p className="mt-1 text-2xl font-black">{number(report.menu.productCount)}</p></div><div className="rounded-2xl bg-[#f6f6f3] p-4"><p className="text-xs text-zinc-500">الأصناف المتاحة</p><p className="mt-1 text-2xl font-black">{number(report.menu.activeProductCount)}</p></div></div><div className="mt-4 divide-y divide-zinc-100">{report.menu.categories.map((category, index) => <div key={`${category.name}-${index}`} className="flex justify-between py-3 text-sm"><span>{category.name}</span><span className="text-zinc-500">{number(category.itemCount)} صنف</span></div>)}</div></section>}
    {report.sections.status && report.status && <div className="mt-4 flex items-center gap-3 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm"><CheckCircle2 className={report.status.active ? 'text-emerald-600' : 'text-zinc-400'}/><div><p className="font-bold">حالة المنيو عند إنشاء التقرير</p><p className="mt-1 text-sm text-zinc-500">{report.status.active ? 'نشط' : 'متوقف'}</p></div></div>}
    <footer className="py-7 text-center text-xs text-zinc-400">تم إنشاء هذا التقرير من منصة mneu-saas</footer>
  </div></main>;
}
