import React, { useEffect, useState } from 'react';
import { doc, getDoc, Timestamp } from '../lib/dataStore';
import { db } from '../lib/firebase';
import { buildStitchDocument, type StitchMenuData } from '../lib/stitchDesign';

type Preview = {
  menu: StitchMenuData;
  designHtml: string;
  expiresAt: Timestamp;
  status: string;
};

export function MenuPreview({ token }: { token: string }) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let alive = true;
    if (!/^[a-zA-Z0-9_-]{16,160}$/.test(token)) {
      setError('رابط المعاينة غير صالح.');
      setBusy(false);
      return;
    }
    getDoc(doc(db, 'menuPreviews', token))
      .then((snap) => {
        if (!alive) return;
        if (!snap.exists()) throw new Error('لم يتم العثور على المعاينة أو انتهت صلاحيتها.');
        const value = snap.data() as Preview;
        if (value.status !== 'active' || !(value.expiresAt instanceof Timestamp) || value.expiresAt.toMillis() <= Date.now()) {
          throw new Error('انتهت صلاحية هذه المعاينة.');
        }
        if (typeof value.designHtml !== 'string' || !value.menu) throw new Error('بيانات المعاينة غير مكتملة.');
        setPreview(value);
      })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : 'تعذر فتح المعاينة.'); })
      .finally(() => { if (alive) setBusy(false); });
    return () => { alive = false; };
  }, [token]);

  if (busy || error || !preview) {
    return <main dir="rtl" className="grid min-h-screen place-items-center bg-zinc-950 p-5 text-white">
      <div className="rounded-2xl border border-white/10 bg-zinc-900 p-7 text-center">{busy ? 'جارٍ تحميل المعاينة…' : error || 'المعاينة غير متاحة.'}</div>
    </main>;
  }

  return <main dir="rtl" className="min-h-screen bg-white">
    <header className="sticky top-0 z-50 flex items-center justify-center bg-zinc-950 px-4 py-3 text-center text-sm font-semibold text-amber-300">
      معاينة للعميل فقط · هذا التصميم لم يُنشر بعد
    </header>
    <iframe
      title="معاينة منيو المطعم"
      className="block h-[calc(100vh-44px)] min-h-[620px] w-full border-0"
      sandbox="allow-scripts allow-forms allow-popups"
      referrerPolicy="no-referrer"
      srcDoc={buildStitchDocument(preview.designHtml, preview.menu)}
    />
  </main>;
}

