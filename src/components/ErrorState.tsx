import React, { useState } from 'react';
import { AlertTriangle, RefreshCw, Sparkles, CheckCircle2 } from 'lucide-react';
import { seedBackFriesToFirestore } from '../lib/seedData';

interface ErrorStateProps {
  error: string;
  currentSlug: string;
  onRetry: () => void;
  onSelectSlug: (slug: string) => void;
  onOpenAdmin?: () => void;
  lang?: 'ar' | 'en';
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  error,
  currentSlug,
  onRetry,
  onSelectSlug,
  onOpenAdmin,
  lang = 'ar'
}) => {
  const isAr = lang === 'ar';
  const [inputSlug, setInputSlug] = useState('');
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputSlug.trim()) {
      onSelectSlug(inputSlug.trim().toLowerCase());
    }
  };

  const handleSeedData = async () => {
    setIsSeeding(true);
    try {
      const res = await seedBackFriesToFirestore();
      if (res.success) {
        setSeedSuccess(true);
        try {
          window.alert("✅ تم زرع وثيقة BACK FRIES في قاعدة بيانات Firestore بنجاح! جاري تحميل المنيو...");
        } catch {
          // في حال كانت بيئة iframe تمنع window.alert
        }
        setTimeout(() => {
          onSelectSlug('backfries');
          onRetry();
        }, 600);
      } else {
        console.error("خطأ أثناء زرع البيانات:", res.error);
        alert(`حدث خطأ أثناء زرع البيانات: ${res.error}`);
      }
    } catch (err) {
      console.error("خطأ غير متوقع:", err);
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-sm border border-[#F1F1F4] space-y-6">
        {/* Warning Icon */}
        <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
          <AlertTriangle className="w-8 h-8" />
        </div>

        {/* Message */}
        <div className="space-y-2">
          <h2 className="text-xl font-extrabold text-[#111111]">
            {isAr ? 'لم يتم العثور على المطعم' : 'Restaurant Not Found'}
          </h2>
          <p className="text-xs text-[#71717A] leading-relaxed max-w-xs mx-auto">
            {error}
          </p>
        </div>

        {/* Current ID Pill */}
        {currentSlug && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-100 text-xs text-zinc-600 font-mono">
            <span>Slug:</span>
            <span className="font-bold text-[#111111]">{currentSlug}</span>
          </div>
        )}

        {/* زرع بيانات BACK FRIES للتجربة - الزر المطلوب بدقة */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/60 border border-amber-200/80 space-y-2.5">
          <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-[#A33900]">
            <Sparkles className="w-4 h-4" />
            <span>قاعدة البيانات فارغة أو قيد التجربة؟</span>
          </div>
          <p className="text-[11px] text-[#71717A] leading-normal">
            اضغط هنا لإنشاء وحقن وثيقة مطعم <strong>backfries</strong> في مجموعة restaurants بضغطة واحدة:
          </p>
          <button
            type="button"
            onClick={handleSeedData}
            disabled={isSeeding}
            className="w-full py-3 px-4 rounded-xl bg-[#A33900] hover:bg-[#7A2B00] text-white font-bold text-xs shadow-md shadow-[#A33900]/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSeeding ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>جاري الزرع في Firestore...</span>
              </>
            ) : seedSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>تم الزرع بنجاح!</span>
              </>
            ) : (
              <>
                <span>🌱</span>
                <span>زرع بيانات BACK FRIES للتجربة</span>
              </>
            )}
          </button>
        </div>

        {/* Change Slug Form */}
        <form onSubmit={handleSubmit} className="space-y-3 pt-2">
          <label className="text-xs font-bold text-[#111111] block text-right">
            {isAr ? 'أو أدخل مُعرّف مطعم موجود في قاعدة بياناتك:' : 'Or enter an existing restaurant ID:'}
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={inputSlug}
              onChange={(e) => setInputSlug(e.target.value)}
              placeholder="مثال: backfries"
              className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:border-[#A33900] bg-zinc-50"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-[#111111] hover:bg-black text-white text-xs font-bold transition-all cursor-pointer"
            >
              {isAr ? 'فتح' : 'Open'}
            </button>
          </div>
        </form>

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-2">
          {onOpenAdmin && (
            <button
              onClick={onOpenAdmin}
              className="w-full py-2.5 px-4 rounded-xl border border-zinc-200 hover:bg-zinc-100 text-[#111111] text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>⚙️ فتح لوحة تحكم الإدارة (Admin Dashboard)</span>
            </button>
          )}

          <button
            onClick={onRetry}
            className="inline-flex items-center justify-center gap-2 text-xs font-bold text-[#71717A] hover:text-[#111111] transition-colors py-1 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{isAr ? 'إعادة فحص قاعدة البيانات' : 'Retry'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

