import React, { useEffect, useState } from 'react';
import { doc, getDoc } from '../lib/dataStore';
import { BarChart3, CalendarDays, CheckCircle2, FileText, Utensils, X, Clock3, TrendingUp } from 'lucide-react';
import { db } from '../lib/firebase';
import { DailyReportStat } from '../lib/reportAnalytics';

export type ReportData = {
  restaurant: { id?: string; name: string; type?: string; logoUrl?: string; currency?: string };
  clientName?: string;
  period: { startDate: string; endDate: string };
  sections: { status: boolean; menu?: boolean };
  metrics: { qrScans: number; linkVisits: number; shareVisits: number; totalVisits: number; daily: DailyReportStat[]; hourly?: { hour: number; visits: number }[] };
  status?: { active: boolean; generatedAt: string };
};

const date = (s: string) => new Date(`${s}T12:00:00`).toLocaleDateString('ar', { year: 'numeric', month: 'long', day: 'numeric' });
const shortDate = (s: string) => new Date(`${s}T12:00:00`).toLocaleDateString('ar', { day: 'numeric', month: 'numeric' });
const number = (value: number) => value.toLocaleString('ar');
const hourRange = (hour: number) => `${String(hour).padStart(2, '0')}:00–${String((hour + 1) % 24).padStart(2, '0')}:00`;

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
  const peakDays = [...report.metrics.daily].sort((a, b) => b.totalVisits - a.totalVisits).slice(0, 3);
  const peakHours = [...(report.metrics.hourly || [])].sort((a, b) => b.visits - a.visits).slice(0, 3);
  return <main dir="rtl" className="min-h-screen bg-[#f5f5f2] px-4 py-7 text-[#181818] sm:px-6 sm:py-12"><div className="mx-auto max-w-2xl">
    <header className="overflow-hidden rounded-[28px] bg-[#1c1c1e] p-6 text-white shadow-xl sm:p-9"><div className="flex items-center gap-3">{report.restaurant.logoUrl ? <img src={report.restaurant.logoUrl} alt={`شعار ${report.restaurant.name}`} className="h-12 w-12 rounded-2xl object-cover"/> : <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#F7E354] text-zinc-900"><Utensils/></div>}<div><p className="text-xs font-bold text-[#F7E354]">تقرير نشاط المنيو</p><h1 className="mt-1 text-xl font-black sm:text-2xl">{report.restaurant.name}</h1><p className="mt-1 text-xs text-zinc-400">إلى: {report.clientName || report.restaurant.name}</p></div></div><div className="mt-6 flex items-center gap-2 rounded-2xl bg-white/5 px-4 py-3 text-sm text-zinc-200"><CalendarDays size={17} className="shrink-0 text-[#F7E354]"/><span>{date(report.period.startDate)} — {date(report.period.endDate)}</span></div><p className="mt-4 text-xs text-zinc-500">تقرير للقراءة فقط · أُعدّ بواسطة إدارة المنصة</p></header>
    <section className="mt-4 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7"><div className="flex items-center gap-2"><BarChart3 className="text-[#927d00]" size={20}/><h2 className="font-black">الزيارات خلال الفترة</h2></div><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{[['ماسحو QR', report.metrics.qrScans], ['زيارات رابط المنيو', report.metrics.linkVisits], ['زيارات المشاركة', report.metrics.shareVisits], ['إجمالي الزيارات', report.metrics.totalVisits]].map(([label, value]) => <div key={String(label)} className="rounded-2xl bg-[#f6f6f3] p-4"><p className="text-[11px] leading-4 text-zinc-500">{label}</p><p className="mt-2 text-xl font-black">{number(Number(value))}</p></div>)}</div>
      {report.metrics.daily.length > 0 && <div className="mt-6"><div className="mb-2 flex justify-between text-[11px] text-zinc-500"><span>الحركة اليومية</span><span>عدد الزيارات</span></div><div className="overflow-x-auto rounded-2xl bg-[#f6f6f3] p-3"><div className="flex h-36 min-w-max items-end gap-1.5">{report.metrics.daily.map(row => <div key={row.date} title={`${date(row.date)}: ${number(row.totalVisits)} زيارة`} className="flex h-full w-9 flex-col items-center justify-end gap-1"><div className="w-4 rounded-t-md bg-[#dbc635]" style={{ height: `${Math.max(4, (row.totalVisits / maxDaily) * 100)}%` }}/><span className="whitespace-nowrap text-[9px] text-zinc-500">{shortDate(row.date)}</span></div>)}</div></div></div>}
      {(peakDays.length > 0 || peakHours.length > 0) && <div className="mt-6 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-[#f6f6f3] p-4"><div className="mb-3 flex items-center gap-2 text-sm font-bold"><TrendingUp size={17} className="text-[#927d00]"/>أكثر الأيام نشاطًا</div>{peakDays.map(row => <div key={row.date} className="flex justify-between gap-2 border-t border-zinc-200 py-2 text-xs"><span>{date(row.date)}</span><strong>{number(row.totalVisits)} زيارة</strong></div>)}</div>{peakHours.length > 0 && <div className="rounded-2xl bg-[#f6f6f3] p-4"><div className="mb-3 flex items-center gap-2 text-sm font-bold"><Clock3 size={17} className="text-[#927d00]"/>أكثر الساعات نشاطًا</div>{peakHours.map(item => <div key={item.hour} className="flex justify-between gap-2 border-t border-zinc-200 py-2 text-xs"><span dir="ltr">{hourRange(item.hour)}</span><strong>{number(item.visits)} زيارة</strong></div>)}</div>}</div>}
    </section>
    {report.sections.status && report.status && <div className="mt-4 flex items-center gap-3 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm"><CheckCircle2 className={report.status.active ? 'text-emerald-600' : 'text-zinc-400'}/><div><p className="font-bold">حالة المنيو عند إنشاء التقرير</p><p className="mt-1 text-sm text-zinc-500">{report.status.active ? 'نشط' : 'متوقف'}</p></div></div>}
    <footer className="py-7 text-center text-xs text-zinc-400">تم إنشاء هذا التقرير من منصة mneu-saas</footer>
  </div></main>;
}

