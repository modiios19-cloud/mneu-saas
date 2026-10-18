import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { PlatformSettings as PlatformSettingsType } from '../../types/restaurant';
import { Save, Store, CheckCircle2, RefreshCw, Plus, Trash2, Sliders } from 'lucide-react';

interface PlatformSettingsProps {
  settings: PlatformSettingsType;
  onSaved: (updated: PlatformSettingsType) => void;
}

export const PlatformSettings: React.FC<PlatformSettingsProps> = ({
  settings,
  onSaved
}) => {
  const [platformName, setPlatformName] = useState(settings.platformName || 'منصة إدارة المطاعم');
  const [platformLogoUrl, setPlatformLogoUrl] = useState(settings.platformLogoUrl || '');
  const [venueTypes, setVenueTypes] = useState(
    settings.allowedVenueTypes || [
      { id: 'restaurant', labelAr: 'مطاعم' },
      { id: 'cafe', labelAr: 'مقاهي' }
    ]
  );
  const [newTypeName, setNewTypeName] = useState('');
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
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
        allowedVenueTypes: venueTypes
      };

      if (db) {
        const docRef = doc(db, 'settings', 'general');
        await setDoc(docRef, updated, { merge: true });
      }

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
              رابط شعار المنصة (Logo URL)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="url"
                value={platformLogoUrl}
                onChange={(e) => setPlatformLogoUrl(e.target.value)}
                placeholder="https://..."
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
            <p className="text-[10px] text-zinc-400 mt-1">
              يظهر هذا الشعار في القائمة الجانبية وأعلى لوحة التحكم
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

        {/* Submit Button (Amber/Gold with Black text) */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
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
