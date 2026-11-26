import React, { useRef, useState } from 'react';
import { auditHtmlDesign } from '../../lib/designAudit';

// Keep the existing Firestore safety limit for both new and existing menus.
export const MAX_HTML_DESIGN_BYTES = 400_000;

type Props = {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  rows?: number;
};

/** Accepts a standalone HTML document from any source without changing its contents. */
export function HtmlDesignInput({ value, onChange, required = false, rows = 8 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState('');
  const bytes = new Blob([value]).size;
  const tooLarge = bytes > MAX_HTML_DESIGN_BYTES;

  const readFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Allow selecting the same file again, including after a failed attempt.
    event.target.value = '';
    if (!file) return;
    setFileError('');
    if (!/\.html?$/i.test(file.name)) {
      setFileError('اختر ملف HTML بامتداد .html أو .htm.');
      return;
    }
    if (file.size > MAX_HTML_DESIGN_BYTES) {
      setFileError('حجم الملف أكبر من 400 كيلوبايت. اختر ملفًا أصغر؛ لم يتغير التصميم الحالي.');
      return;
    }
    try {
      const text = await file.text();
      if (new Blob([text]).size > MAX_HTML_DESIGN_BYTES) {
        setFileError('حجم محتوى الملف أكبر من 400 كيلوبايت؛ لم يتغير التصميم الحالي.');
        return;
      }
      onChange(text);
    } catch {
      setFileError('تعذرت قراءة الملف؛ لم يتغير التصميم الحالي.');
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-[11px] leading-5 text-zinc-400">
        الصق مستند HTML كاملًا أو اختر ملفًا من أي مصدر. الأفضل تصميم بسيط بملف صغير وصور مضغوطة لتسريع الفتح على الإنترنت الضعيف.
        حجم الكود وحده لا يشمل الصور والخطوط والملفات الخارجية. استخدم روابط متاحة للجمهور بدل مسارات ملفات محلية.
      </p>
      <p className="text-[11px] leading-5 text-zinc-400">
        لعرض بيانات المنيو وتحديثها داخل التصميم، يجب أن يقرأ <code dir="ltr">window.MENU_DATA</code> ويستمع إلى <code dir="ltr">menu-data-update</code>؛ وللتعديل بالنقر يجب إضافة علامات <code dir="ltr">data-menu-edit</code> وفق دليل الربط. استخدم أكوادًا من مصادر موثوقة فقط.
      </p>
      <input ref={inputRef} type="file" accept=".html,.htm,text/html" onChange={readFile} className="hidden" aria-label="اختيار ملف تصميم HTML" />
      <button type="button" onClick={() => inputRef.current?.click()} className="rounded-xl border border-white/20 px-3 py-2 text-xs font-bold text-amber-300 hover:bg-white/5">
        اختيار ملف HTML
      </button>
      <textarea
        value={value}
        onChange={(event) => { setFileError(''); onChange(event.target.value); }}
        rows={rows}
        required={required}
        dir="ltr"
        className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-3 font-mono text-xs text-amber-100 focus:outline-none focus:border-amber-400"
        aria-label="كود تصميم HTML"
      />
      <div dir="rtl" aria-live="polite" className={`text-[11px] ${tooLarge ? 'text-red-400' : 'text-zinc-400'}`}>
        حجم الكود: {(bytes / 1000).toFixed(1)} / 400 كيلوبايت ({bytes.toLocaleString()} / 400,000 بايت)
        {tooLarge && ' — يتجاوز الحد المسموح للحفظ.'}
      </div>
      {value.trim() && <details className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs">
        <summary className="cursor-pointer font-bold text-amber-300">فحص مبدئي للتصميم والخفة</summary>
        <ul className="mt-2 space-y-1.5 text-zinc-300">{auditHtmlDesign(value).map((check, index) => <li key={index}>{check.level === 'ok' ? '✓' : '⚠'} {check.text}</li>)}</ul>
      </details>}
      {fileError && <p role="alert" className="text-xs text-red-400">{fileError}</p>}
    </div>
  );
}
