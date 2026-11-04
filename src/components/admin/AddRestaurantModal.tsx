import { saveRestaurant } from '../../lib/menuRepository';
import React, { useState } from 'react';
import { doc, setDoc } from '../../lib/dataStore';
import { db } from '../../lib/firebase';
import { RestaurantData } from '../../types/restaurant';
import { X, Plus, Store, Sparkles } from 'lucide-react';

interface AddRestaurantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (newRestaurant: RestaurantData) => void;
}

export const AddRestaurantModal: React.FC<AddRestaurantModalProps> = ({
  isOpen,
  onClose,
  onCreated
}) => {
  if (!isOpen) return null;

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#A33900');
  const [logoUrl, setLogoUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!slug || slug === name.toLowerCase().replace(/[^a-z0-9]/g, '-')) {
      const generated = val
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-');
      if (generated) setSlug(generated);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) {
      alert("يرجى إدخال اسم المطعم والمعرّف");
      return;
    }

    setLoading(true);
    try {
      if (!db) {
        throw new Error("اتصال Firebase غير متاح");
      }

      const cleanSlug = slug.trim().toLowerCase();

      const newRestaurant: RestaurantData = {
        id: cleanSlug,
        slug: cleanSlug,
        name: name.trim(),
        nameEn: name.trim(),
        logoUrl: logoUrl.trim() || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=160',
        primaryColor,
        secondaryColor: '#FFEDE5',
        currency: 'ر.س',
        statusText: 'مفتوح للطلبات الآن',
        statusTextEn: 'Open for orders now',
        isActive: true,
        categories: [
          { id: 'all', labelAr: 'الأكثر طلباً', labelEn: 'Signature', sublabelEn: 'SIGNATURE & BEST' },
          { id: 'الأطباق الرئيسية', labelAr: 'الأطباق الرئيسية', labelEn: 'Main Dishes' },
          { id: 'المشروبات', labelAr: 'المشروبات', labelEn: 'Drinks' }
        ],
        products: [
          {
            id: `item-${Date.now()}-1`,
            categoryId: 'الأطباق الرئيسية',
            nameAr: `طبق ${name.trim()} الخاص`,
            nameEn: `${name.trim()} Signature`,
            price: 35,
            calories: 550,
            descriptionAr: 'طبق محضر بأجود المكونات الطازجة والتوابل الخاصة.',
            imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
            isPopular: true
          }
        ],
        contact: {
          phone: '+966500000000',
          whatsapp: '+966500000000',
          locationNameAr: 'المملكة العربية السعودية',
          workingHoursAr: 'يومياً من 12:00 ظهراً وحتى 1:00 صباحاً'
        }
      };

      // Firestore payload
      const payload = {
        name: newRestaurant.name,
        nameEn: newRestaurant.nameEn,
        slug: newRestaurant.slug,
        primaryColor: newRestaurant.primaryColor,
        secondaryColor: newRestaurant.secondaryColor,
        logo: newRestaurant.logoUrl,
        logoUrl: newRestaurant.logoUrl,
        currency: newRestaurant.currency,
        statusText: newRestaurant.statusText,
        isActive: true,
        categories: newRestaurant.categories,
        products: newRestaurant.products,
        items: newRestaurant.products.map((p) => ({
          name: p.nameAr,
          price: p.price,
          calories: p.calories,
          description: p.descriptionAr,
          category: p.categoryId,
          image: p.imageUrl
        })),
        contact: newRestaurant.contact,
        createdAt: new Date().toISOString()
      };

      await saveRestaurant(cleanSlug, { ...payload, isActive: false }, { create: true });

      onCreated({ ...newRestaurant, isActive: false });
      onClose();
    } catch (err: any) {
      console.error("Error creating restaurant:", err);
      alert(`حدث خطأ أثناء إنشاء المطعم: ${err?.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl z-10 space-y-5 animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-1.5 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-1 pt-2">
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 text-[#111111] flex items-center justify-center mx-auto shadow-inner">
            <Store className="w-6 h-6" />
          </div>
          <h3 className="text-base font-extrabold text-[#111111]">
            إضافة مطعم جديد للمنصة
          </h3>
          <p className="text-xs text-[#71717A]">
            أنشئ مساحة مخصصة لمنيو رقمي بهوية بصرية مستقلة
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="font-bold text-[#111111] block mb-1">
              اسم المطعم أو المقهى *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="مثال: برجر هاوس أو كافيه لافندر"
              className="w-full p-3 rounded-xl border border-zinc-200 focus:outline-none focus:border-[#111111]"
              required
            />
          </div>

          <div>
            <label className="font-bold text-[#111111] block mb-1">
              المعرّف بالرابط (Slug) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-mono text-[11px] dir-ltr" dir="ltr">
                ?id=
              </span>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="burger-house"
                className="w-full p-3 pl-12 rounded-xl border border-zinc-200 focus:outline-none focus:border-[#111111] font-mono"
                required
              />
            </div>
            <p className="text-[10px] text-zinc-400 mt-1">
              سيستخدم في رابط القائمة: ?id={slug || 'your-slug'}
            </p>
          </div>

          <div>
            <label className="font-bold text-[#111111] block mb-1">
              اللون الأساسي للبراند (Primary Color)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-10 h-10 rounded-xl cursor-pointer border border-zinc-300 p-0.5 bg-white"
              />
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="p-2.5 rounded-xl border border-zinc-200 font-mono w-28 text-xs font-bold"
              />
              <div
                className="flex-1 py-2 px-3 rounded-xl text-white font-bold text-center text-[11px]"
                style={{ backgroundColor: primaryColor }}
              >
                معاينة
              </div>
            </div>
          </div>

          <div>
            <label className="font-bold text-[#111111] block mb-1">
              رابط الشعار (اختياري)
            </label>
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://..."
              className="w-full p-3 rounded-xl border border-zinc-200 focus:outline-none focus:border-[#111111]"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-[#111111] hover:bg-black text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{loading ? 'جاري الإنشاء في Firestore...' : 'إنشاء وحفظ المطعم'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

