import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { RestaurantData, MenuItem, Category } from '../types/restaurant';

// نموذج افتراضي لـ BACK FRIES ومطاعم أخرى للتجربة
const DEMO_RESTAURANTS: Record<string, RestaurantData> = {
  backfries: {
    id: 'backfries',
    slug: 'backfries',
    name: 'BACK FRIES',
    nameEn: 'BACK FRIES',
    logoUrl: 'https://lh3.googleusercontent.com/aida/AEtjO1UYzrwvXqABYl6SLV7TZjhpohEHDAXg90Q2TXIx2bltHCE16e_iuisdpjuy80npzAzXKpz8dT9z1qA-y4BF6q2SYqSuOX7WikA021Kr3U74VlsinNtrepLG7dC3DQBEI4gybJ28cyV2X49VylVCBu6RQ2fmThXCyjolRueW-LuFnW9GhLwQv-_ib9iFFworDt64zvzyTqCUxPKCBPiCW4p1RM9e-IMO_9MkpRK0HrEbJJ1nX41tiAxSgTs',
    primaryColor: '#A33900',
    secondaryColor: '#FFEDE5',
    currency: 'ر.س',
    statusText: 'مفتوح للطلبات الآن',
    statusTextEn: 'Open for orders now',
    categories: [
      { id: 'all', labelAr: 'الأكثر طلباً', labelEn: 'Signature', sublabelEn: 'SIGNATURE & BEST' },
      { id: 'سلال البطاطس', labelAr: 'سلال البطاطس', labelEn: 'Loaded Fries', sublabelEn: 'LOADED FRIES' },
      { id: 'برجر السماش', labelAr: 'برجر السماش', labelEn: 'Smash Burgers', sublabelEn: 'SMASH BURGERS' },
      { id: 'المشروبات والصلصات', labelAr: 'المشروبات والصلصات', labelEn: 'Drinks & Sauces', sublabelEn: 'DRINKS & SAUCES' }
    ],
    products: [
      {
        id: 'truffle-cheesy-fries',
        categoryId: 'الأكثر طلباً',
        nameAr: 'ترافل تشيزي فرايز',
        nameEn: 'Truffle Cheesy Fries',
        price: 32,
        calories: 640,
        descriptionAr: 'بطاطس ذهبية مقرمشة غنية بجبنة الشيدر المعتقة وصلصة الترافل الأسود الفاخر واللحم المقرمش.',
        descriptionEn: 'Crisp golden fries tossed in aged melted cheddar, black truffle emulsion, and crispy beef bits.',
        imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBZowfb8RFoALBdVCKovKZ-Rpvm6vGCmxkwnlt9up-xXqrMKbBIRwIPrCWje3tieQWdQTCD5dhSXOPEn-sdJEGvPXzePBVXdcJyn14EWaXM6pNq3E9uIpZ1x6esxP5Uk_deHRaUC3EibJCZcH1xDvd7HIhr8O_TpF6rf2j88lQxZe3vPm0roM88uDz8fshLLaqXVY9_vzqviLpwRKa-z4uPqtBICc_LEG4TM8NCwZhQdG2Fra3I7Kzx',
        isPopular: true
      },
      {
        id: 'double-smash-burger',
        categoryId: 'برجر السماش',
        nameAr: 'دوبل سماش برجر خاص',
        nameEn: 'Double Smash Special Burger',
        price: 42,
        calories: 780,
        descriptionAr: 'شريحتان لحم أنجوس طازج مشوي بأسلوب السماش المقرمش، جبنة أمريكية ذائبة، ومخلل منزلي وبصل مكرمل.',
        descriptionEn: 'Two freshly smashed Angus beef patties, molten American cheese, house pickles, and caramelized onion relish.',
        imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB3pKKfr-SH0iAtS70o4FpA_usXzrSQRJpjx3Gb3980lOuCGvDANlaSEd3bQrKXq6UwabUpFpZjBCM0mvK6D9wz6X6QwVLGa3_IIJ-3u1K9PuC6u1T-5zkbb36a2LzfMiNPn8XQ3tNEDXp__uJVbYzyEE51NyBySQODRUftJjrTPA4C-Pfc2LZGNdqYUDKWAIb13XfLikkyWU-gUcDT8xBBplwptgWI_Z2XR4iQjolM7dJmm0iRUyt7',
        isPopular: true
      },
      {
        id: 'volcano-loaded-fries',
        categoryId: 'سلال البطاطس',
        nameAr: 'فولكانو لودد فرايز',
        nameEn: 'Volcano Loaded Fries',
        price: 29,
        calories: 610,
        descriptionAr: 'بطاطس متبلة مع قطع الهالبينو المقرمشة وصوص الفولكانو وجبنة المونتري جاك.',
        descriptionEn: 'Seasoned fries crowned with crispy jalapeños, fiery volcano sauce, and melted Monterey Jack cheese.',
        imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAkGEF3qxjbe2_aw8KRNTIKC1_4Q-AzKhKKEQ7gW-abIFL0G24kGHSJch_LG7JKXWHxvPjMV8MC8JEglYXXWqPoq45dGkRsjhu4Sxb7a6L-K9mbrh7u2NsSl0HhJKxyhlauspDN1XfNgJbEPaeqGwCsLr6iBGsg_36zWeQf9riLAyQpxi2QW5qeVpJXnvzqy0z7Zbg-g8qwWyQdPupwaiBDxu1EjEViUWXBKjMFBhp8kPjmhCu21LK1',
        isSpicy: true
      },
      {
        id: 'passion-fruit-mojito',
        categoryId: 'المشروبات والصلصات',
        nameAr: 'باشن فروت موهيتو',
        nameEn: 'Passion Fruit Mojito',
        price: 18,
        calories: 140,
        descriptionAr: 'ليمون، نعناع، سيرب باشن طبيعي منعش.',
        descriptionEn: 'Zesty fresh lime, crushed garden mint, natural sparkling passion fruit puree.',
        imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDU-mgd25bJ8iSOTYjjVkifmootOM1lxxyFHZDL7ttSIyEka1kAtEaKONUnKNTrvoHOaCAqojotWrTCkyY0mor7MSbRaUWZRumEFmErpT99-sUeSGmZZROtRCTY8LqLQDUscL4tDA61_6Xqnmjl54gQyWIQeYLLX_zpvPQvqBh34dqQc90XWeFtMrS-lvlhPg5vX_FfEwqfjVISfRmA4yE6OUeCeLg5a-aTDvi2AdK9L1zqb8NVkAaI',
        isPopular: true
      }
    ],
    contact: {
      phone: '+966500000000',
      whatsapp: '+966500000000',
      maps: 'https://maps.google.com/?q=Back+Fries',
      instagram: 'https://instagram.com/backfries'
    }
  }
};

/**
 * دالة لمعايرة وتوحيد وثيقة Firestore سواء كانت بالحقول المباشرة أو المصفوفات
 */
function normalizeRestaurantData(docId: string, rawData: any): RestaurantData {
  const logoUrl = rawData.logo || rawData.logoUrl || '';

  // معالجة الأقسام (سواء كانت مصفوفة نصوص أو كائنات)
  const rawCategories = rawData.categories || [];
  const categories: Category[] = rawCategories.map((cat: any) => {
    if (typeof cat === 'string') {
      return {
        id: cat,
        labelAr: cat,
        labelEn: cat,
        sublabelEn: ''
      };
    }
    return cat;
  });

  // إضافة تبويب "الكل / الأكثر طلباً" في البداية إذا لم يكن موجوداً
  const hasAll = categories.some((c) => c.id === 'all');
  if (!hasAll) {
    categories.unshift({
      id: 'all',
      labelAr: 'الأكثر طلباً',
      labelEn: 'All Favorites',
      sublabelEn: 'SIGNATURE & BEST'
    });
  }

  // معالجة المنتجات (items أو products)
  // `products` is the canonical shape. `items` is retained only for legacy records.
  const rawItems = rawData.products ?? rawData.items ?? [];
  const products: MenuItem[] = rawItems.map((item: any, idx: number) => ({
    id: item.id || `item-${idx}`,
    categoryId: item.category || item.categoryId || categories[0]?.id || 'all',
    nameAr: item.name || item.nameAr || '',
    nameEn: item.nameEn || item.name || '',
    descriptionAr: item.description || item.descriptionAr || '',
    descriptionEn: item.descriptionEn || item.description || '',
    price: Number(item.price) || 0,
    originalPrice: item.originalPrice ? Number(item.originalPrice) : undefined,
    calories: item.calories,
    imageUrl: item.image || item.imageUrl || '',
    isPopular: item.category === 'الأكثر طلباً' || item.isPopular || false,
    isSpicy: item.isSpicy || false,
    isVegetarian: item.isVegetarian || false,
    isSoldOut: item.isSoldOut || false,
    badge: item.badge
  }));

  return {
    id: docId,
    slug: docId,
    name: rawData.name || 'Restaurant',
    nameEn: rawData.nameEn || rawData.name,
    logoUrl,
    stitchDesignCode: typeof rawData.stitchDesignCode === 'string' ? rawData.stitchDesignCode : '',
    isActive: rawData.isActive !== false,
    type: rawData.type || 'restaurant',
    coverUrl: rawData.coverUrl || '',
    updatedAt: rawData.updatedAt || '',
    primaryColor: rawData.primaryColor || '#A33900',
    secondaryColor: rawData.secondaryColor || '#FFEDE5',
    currency: rawData.currency || 'ر.س',
    statusText: rawData.statusText || 'مفتوح للطلبات الآن',
    statusTextEn: rawData.statusTextEn || 'Open for orders now',
    categories,
    products,
    contact: rawData.contact || {}
  };
}

export function useRestaurant(slug: string | null) {
  const [data, setData] = useState<RestaurantData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRestaurant = useCallback(async () => {
    if (!slug) {
      setLoading(false);
      setError('لم يتم تحديد مُعرّف المطعم في الرابط. يرجى تزويد الرابط بـ ?id=backfries');
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    const cleanSlug = slug.trim().toLowerCase();

    // القراءة من Firestore
    if (isFirebaseConfigured && db) {
      try {
        const docRef = doc(db, 'restaurants', cleanSlug);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const normalized = normalizeRestaurantData(docSnap.id, docSnap.data());
          setData(normalized);
          setLoading(false);
          return;
        }

        // فحص بالاستعلام إذا كان slug مخزن كحقل
        const q = query(collection(db, 'restaurants'), where('slug', '==', cleanSlug));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const firstDoc = querySnapshot.docs[0];
          const normalized = normalizeRestaurantData(firstDoc.id, firstDoc.data());
          setData(normalized);
          setLoading(false);
          return;
        }

        // إذا كان المعرف backfries ولم يُزرع بعد في Firestore، نتيح استخدام النموذج التجريبي
        if (DEMO_RESTAURANTS[cleanSlug]) {
          setData(DEMO_RESTAURANTS[cleanSlug]);
          setLoading(false);
          return;
        }

        setError(`المطعم بالمعرف "${cleanSlug}" غير موجود في قاعدة بيانات Firebase.`);
        setData(null);
        setLoading(false);
        return;
      } catch (err: any) {
        console.error('Error fetching restaurant from Firestore:', err);
        if (DEMO_RESTAURANTS[cleanSlug]) {
          setData(DEMO_RESTAURANTS[cleanSlug]);
          setLoading(false);
          return;
        }
        setError(`حدث خطأ أثناء جلب بيانات المطعم من Firestore: ${err?.message || 'خطأ غير معروف'}`);
        setData(null);
        setLoading(false);
        return;
      }
    }

    // Fallback محلي
    const timer = setTimeout(() => {
      if (DEMO_RESTAURANTS[cleanSlug]) {
        setData(DEMO_RESTAURANTS[cleanSlug]);
        setError(null);
      } else {
        setData(null);
        setError(`عذراً، لم يتم العثور على مطعم بالمعرف "${cleanSlug}". تأكد من صحة الرابط أو جرب ?id=backfries`);
      }
      setLoading(false);
    }, 400);

    return () => clearTimeout(timer);
  }, [slug]);

  useEffect(() => {
    fetchRestaurant();
  }, [fetchRestaurant]);

  return {
    data,
    loading,
    error,
    reload: fetchRestaurant
  };
}
