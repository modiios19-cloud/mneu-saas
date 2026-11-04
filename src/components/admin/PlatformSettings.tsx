import React, { useEffect, useRef, useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { PlatformSettings as PlatformSettingsType } from '../../types/restaurant';
import { Save, Store, CheckCircle2, RefreshCw, Plus, Trash2, Sliders, Upload, X } from 'lucide-react';

interface PlatformSettingsProps {
  settings: PlatformSettingsType;
  onSaved: (updated: PlatformSettingsType) => void;
}

async function compressLogo(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('اختر ملف صورة صالحًا.');
  if (file.size > 8 * 1024 * 1024) throw new Error('حجم الصورة كبير؛ اختر صورة أصغر من 8 ميغابايت.');
  const image = await createImageBitmap(file);
  const scale = Math.min(1, 512 / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('تعذرت معالجة الصورة في هذا المتصفح.');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close();
  for (const quality of [0.86, 0.72, 0.58, 0.44]) {
    const dataUrl = canvas.toDataURL('image/webp', quality);
    if (dataUrl.startsWith('data:image/webp') && dataUrl.length <= 320_000) return dataUrl;
  }
  throw new Error('تعذر ضغط الشعار للحجم المسموح. استخدم شعارًا أبسط أو رابط صورة.');
}

export const PlatformSettings: React.FC<PlatformSettingsProps> = ({
  settings,
  onSaved
}) => {
  const [platformName, setPlatformName] = useState(settings.platformName || 'منصة إدارة المطاعم');
  const [platformLogoUrl, setPlatformLogoUrl] = useState(settings.platformLogoUrl || '');
  const [publicBaseUrl, setPublicBaseUrl] = useState(settings.publicBaseUrl || '');
  const [compressingLogo, setCompressingLogo] = useState(false);
  const [venueTypes, setVenueTypes] = useState(
    settings.allowedVenueTypes || [
      { id: 'restaurant', labelAr: 'مطاعم' },
      { id: 'cafe', labelAr: 'مقاهي' }
    ]
  );
  const [newTypeName, setNewTypeName] = useState('');
  const [saving, setSaving] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const initialRender = useRef(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleLogoFile = async (file?: File) => {
    if (!file) return;
    setCompressingLogo(true);
    try {
      setPlatformLogoUrl(await compressLogo(file));
      showToast('تم تجهيز الشعار؛ اضغط حفظ لتطبيقه');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'تعذر تجهيز الشعار.');
    } finally {
      setCompressingLogo(false);
    }
  };

  const handleAddType = () => {
    if (!newTypeName.trim()) return;
    const label = newTypeName.trim();
    const id = label.toLowerCase().replace(/[^a-z0-9]/g, '-') || `type-${Date.now()}`;
    if (venueTypes.some((t) => t.id === id || t.labelAr === label)) {
      alert('هذا التصنيف مضاف مسبقاً');
      return;
    }
    setVenueTypes([...venueTypes, { id, labelAr: label }]);
    setNewTypeName('');
    showToast(`تمت إضافة تصنيف "${label}"`);
  };

  const handleRemoveType = (id: string) => {
    if (venueTypes.length <= 1) {
      alert('يجب الإبقاء على تصنيف واحد على الأقل');
      return;
    }
    setVenueTypes(venueTypes.filter((t) => t.id !== id));
  };

  // Dashboard settings are configuration data, never code changes.
  // Debounce saves to avoid writing to Firestore on each keystroke.
  useEffect(() => {
    if (initialRender.current) {
      initialRender.current = false;
      return;
    }
    let active = true;
    setAutoSaveStatus('saving');
    const timeout = setTimeout(async () => {
      try {
        if (!db) throw new Error('Firestore unavailable');
        const updated: PlatformSettingsType = {
          platformName: platformName.trim(),
          platformLogoUrl: platformLogoUrl.trim(),
          allowedVenueTypes: venueTypes,
          publicBaseUrl: publicBaseUrl.trim()
        };
        if (!updated.platformName) { if (active) setAutoSaveStatus('error'); return; }
        await setDoc(doc(db, 'settings', 'general'), updated, { merge: true });
        if (active) { setAutoSaveStatus('saved'); onSaved(updated); }
      } catch (error) {
        console.error('Settings autosave failed', error);
        if (active) setAutoSaveStatus('error');
      }
    }, 1200);
    return () => { active = false; clearTimeout(timeout); };
  }, [platformName, platformLogoUrl, venueTypes, publicBaseUrl]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!platformName.trim()) {
      alert('يرجى كتابة اسم المنصة');
      return;
    }

    setSaving(true);
    try {
      const updated: PlatformSettingsType = {
        platformName: platformName.trim(),
        platformLogoUrl: platformLogoUrl.trim(),
        allowedVenueTypes: venueTypes,
        publicBaseUrl: publicBaseUrl.trim()
      };

      if (!db) throw new Error('Firestore unavailable');
      const docRef = doc(db, 'settings', 'general');
      await setDoc(docRef, updated, { merge: true });

      showToast('تم حفظ إعدادات المنصة في Firestore بنجاح');
      onSaved(updated);
    } catch (err: any) {
      console.error('Error saving platform settings:', err);
      alert(`حدث خطأ أثناء الحفظ: ${err?.message || err}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl font-sans">
      {/* Toast Notification (Black & Yellow) */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-black text-amber-400 border border-amber-400/30 text-xs font-bold px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Info */}
      <div className="bg-white p-6 rounded-3xl border border-zinc-200/80 shadow-xs space-y-1">
        <div className="flex items-center gap-2 text-base font-extrabold text-black">
          <Sliders className="w-5 h-5 text-amber-400" />
          <h2>إعدادات المنصة العامة (Platform Settings)</h2>
        </div>
        <p className="text-xs text-zinc-600 leading-relaxed">
          تخصيص الهوية العامة للداشبورد وتصنيفات الأنشطة المتاحة في النظام، وتخزينها في <code>settings/general</code>
          <span className={`block pt-2 font-bold ${autoSaveStatus === 'error' ? 'text-red-600' : 'text-zinc-500'}`}>{autoSaveStatus === 'saving' ? 'يجري الحفظ التلقائي…' : autoSaveStatus === 'saved' ? 'الإعدادات محفوظة تلقائيًا في Firebase' : autoSaveStatus === 'error' ? 'تعذر الحفظ التلقائي؛ تحقق من اتصال Firebase وصلاحياته' : 'تُحفظ التعديلات تلقائيًا بعد التوقف عن الكتابة'}</span>
        </p>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-5">
        {/* Branding Box */}
        <div className="bg-white p-6 rounded-3xl border border-zinc-200/80 shadow-xs space-y-4">
          <h3 className="text-xs font-bold text-black border-b border-zinc-100 pb-2">
            هوية وشعار لوحة التحكم
          </h3>

          <div>
            <label className="text-xs font-bold text-black block mb-1">
              اسم المنصة (Platform Brand Name) *
            </label>
            <input
              type="text"
              value={platformName}
              onChange={(e) => setPlatformName(e.target.value)}
              placeholder="مثلاً: منصة قوائمي أو نظام المنيو الذكي"
              className="w-full text-xs p-3 rounded-xl border border-zinc-200 focus:outline-none focus:border-black bg-zinc-50/50"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-black block mb-1">
              شعار لوحة التحكم
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="text"
                inputMode="url"
                value={platformLogoUrl.startsWith('data:') ? '' : platformLogoUrl}
                onChange={(e) => setPlatformLogoUrl(e.target.value)}
                placeholder={platformLogoUrl.startsWith('data:') ? 'تم رفع صورة من الجهاز؛ الصق رابطًا لاستبدالها' : 'الصق رابط صورة الشعار (اختياري)'}
                className="flex-1 text-xs p-3 rounded-xl border border-zinc-200 focus:outline-none focus:border-black bg-zinc-50/50"
              />
              {platformLogoUrl ? (
                <img
                  src={platformLogoUrl}
                  alt="Platform Logo Preview"
                  className="w-10 h-10 rounded-xl object-contain border border-zinc-200 bg-zinc-100 p-1"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-black border border-amber-400/20 flex items-center justify-center text-amber-400">
                  <Store className="w-5 h-5" />
                </div>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <label className={`inline-flex cursor-pointer items-center gap-2 rounded-xl bg-black px-3 py-2 text-xs font-bold text-amber-400 ${compressingLogo ? 'opacity-50' : ''}`}>
                <Upload className="h-4 w-4"/>
                {compressingLogo ? 'جارٍ تجهيز الصورة…' : 'رفع صورة من الجهاز'}
                <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" disabled={compressingLogo} onChange={e => { void handleLogoFile(e.target.files?.[0]); e.currentTarget.value = ''; }}/>
              </label>
              {platformLogoUrl && <button type="button" onClick={() => setPlatformLogoUrl('')} className="inline-flex items-center gap-1 rounded-xl border border-zinc-200 px-3 py-2 text-xs font-bold text-zinc-600"><X className="h-3.5 w-3.5"/>إزالة الشعار</button>}
            </div>
            <p className="text-[10px] text-zinc-400 mt-1">
              ارفع PNG أو JPG أو WebP، أو الصق رابطًا. يُضغط الشعار محليًا قبل حفظه في إعدادات المنصة.
            </p>
          </div>
        </div>

        {/* Venue Categories Box */}
        <div className="bg-white p-6 rounded-3xl border border-zinc-200/80 shadow-xs space-y-4">
          <h3 className="text-xs font-bold text-black border-b border-zinc-100 pb-2">
            أعمدة وتصنيفات الأنشطة (مطاعم، مقاهي، حلويات...)
          </h3>

          <div className="flex gap-2">
            <input
              type="text"
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              placeholder="أدخل تصنيف جديد (مثال: حلويات، مخابز، عصائر)..."
              className="flex-1 text-xs p-3 rounded-xl border border-zinc-200 focus:outline-none focus:border-black bg-zinc-50/50"
            />
            <button
              type="button"
              onClick={handleAddType}
              className="px-4 py-2 rounded-xl bg-black hover:bg-zinc-900 text-amber-400 border border-amber-400/20 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span>إضافة</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
            {venueTypes.map((t) => (
              <div
                key={t.id}
                className="p-3 rounded-xl border border-zinc-200/80 bg-zinc-50 flex items-center justify-between text-xs"
              >
                <span className="font-bold text-black">{t.labelAr}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveType(t.id)}
                  className="text-zinc-400 hover:text-black p-1 transition-colors cursor-pointer"
                  title="حذف"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Preview URL is a platform setting, never a hardcoded URL. */}
        <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 space-y-2">
          <h3 className="text-sm font-bold text-black">رابط الموقع العام لمعاينات العملاء</h3>
          <p className="text-xs leading-5 text-zinc-500">بعد إعداد الاستضافة، أدخل عنوان HTTPS العام هنا. سيُستخدم تلقائيًا لإنشاء روابط المعاينة المرسلة عبر واتساب. روابط Google AI Studio الداخلية لا تصلح للعملاء.</p>
          <input
            type="url"
            dir="ltr"
            value={publicBaseUrl}
            onChange={(e) => setPublicBaseUrl(e.target.value)}
            placeholder="https://menu.example.com"
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-black"
          />
        </div>

        {/* Submit Button (Amber/Gold with Black text) */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={saving || compressingLogo}
            className="w-full py-3.5 px-6 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-black" />
                <span>جاري الحفظ في Firestore...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-black" />
                <span>حفظ التعديلات في Firestore</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
