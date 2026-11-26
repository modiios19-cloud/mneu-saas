import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { buildStitchDocument } from '../../lib/stitchDesign';
import { parseMenuImport } from '../../lib/importMenuData';

/** Local-only preview; never reads or writes the restaurant database. */
export function DemoMenuPreview({ onClose }: { onClose: () => void }) {
  const [document, setDocument] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([import('../../demo/sana-menu.html?raw'), import('../../demo/sana-menu.json?raw')]).then(([html, raw]) => {
      if (!active) return;
      const data = parseMenuImport(raw.default);
      const restaurant = { id: 'demo-local', slug: 'demo-local', name: data.name || 'شاورما سنا', nameEn: data.nameEn, logoUrl: data.logoUrl, primaryColor: data.primaryColor, secondaryColor: data.secondaryColor, currency: data.currency, statusText: data.statusText, contact: data.contact || {} };
      setDocument(buildStitchDocument(html.default, { restaurant, categories: data.categories || [], products: data.products || [], menuGroups: data.menuGroups || [], offers: (data.products || []).filter(p => p.badge === 'offer') }));
    }).catch(() => { if (active) setError('تعذر فتح المعاينة. أعد المحاولة.'); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  return <div className="fixed inset-0 z-[180] flex justify-center bg-black/85 p-2 sm:p-5" dir="rtl" role="dialog" aria-modal="true" aria-label="معاينة منيو سنا التجريبي" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900 text-white shadow-2xl">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-700 px-4 py-3">
        <div><h2 className="text-sm font-bold text-amber-300">معاينة منيو سنا التجريبي</h2><p className="mt-1 text-xs text-zinc-300">معاينة فقط، لم يُحفظ مطعم. الأرقام والروابط والأسعار افتراضية.</p></div>
        <button type="button" onClick={onClose} aria-label="إغلاق المعاينة" className="rounded-lg border border-zinc-600 p-2 text-zinc-200 hover:bg-zinc-700"><X size={20}/></button>
      </header>
      {error ? <p className="p-6 text-center text-sm text-red-300">{error}</p> : !document ? <p className="p-6 text-center text-sm text-zinc-300">جارٍ تجهيز المنيو…</p> : <div className="mx-auto flex min-h-0 w-full max-w-xl flex-1 flex-col bg-white">
        <iframe title="معاينة منيو سنا داخل الداشبورد" className="min-h-0 w-full flex-1 border-0 bg-white" sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox" referrerPolicy="strict-origin-when-cross-origin" srcDoc={document}/>
      </div>}
    </section>
  </div>;
}
