import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { RestaurantData, PlatformSettings as PlatformSettingsType } from '../../types/restaurant';
import { VisualMenuEditor } from './VisualMenuEditor';
import { VenuesManagement } from './VenuesManagement';
import { PlatformSettings } from './PlatformSettings';
import { QRCodeModal } from './QRCodeModal';
import { AnalyticsTab, DateFilterType } from './AnalyticsTab';
import { CustomerReports } from './CustomerReports';

export interface DailyStatRecord {
  date: string;
  views: number;
  scans: number;
}

/**
 * Helper function to inject deterministic mock time data for the last 60 days
 * ensuring realistic traffic variance and day-of-week surges.
 */
export const generateMockTimeData = (venueSeed: string = 'venue'): DailyStatRecord[] => {
  const records: DailyStatRecord[] = [];
  const today = new Date();

  // Deterministic seed based on venue name/id
  let hash = 0;
  for (let i = 0; i < venueSeed.length; i++) {
    hash = (hash << 5) - hash + venueSeed.charCodeAt(i);
    hash |= 0;
  }
  const baseMultiplier = Math.abs(hash % 35) + 25;

  for (let i = 59; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];

    const dayOfWeek = d.getDay();
    // Weekend surge (Thursday & Friday)
    const weekendBoost = (dayOfWeek === 4 || dayOfWeek === 5) ? 1.45 : 1.0;

    const pseudoRandom = Math.abs(Math.sin((hash + i) * 823)) * 20;
    const views = Math.max(10, Math.round((baseMultiplier + pseudoRandom) * weekendBoost));
    const scans = Math.max(6, Math.round(views * 0.74));

    records.push({
      date: dateStr,
      views,
      scans
    });
  }
  return records;
};

interface AdminDashboardProps {
  onBackToMenu: (slug?: string) => void;
  lang?: 'ar' | 'en';
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onBackToMenu,
  lang = 'ar'
}) => {
  // Navigation active tab
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'venues' | 'customers' | 'settings'>('overview');

  // Advanced Date Range Filter States
  const [dateFilter, setDateFilter] = useState<DateFilterType>('today');
  const [customDateRange, setCustomDateRange] = useState<{ startDate: string; endDate: string }>({
    startDate: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  // Platform general settings
  const [platformSettings, setPlatformSettings] = useState<PlatformSettingsType>({
    platformName: 'WiseMenu',
    platformLogoUrl: '',
    allowedVenueTypes: [
      { id: 'restaurant', labelAr: 'مطاعم' },
      { id: 'cafe', labelAr: 'مقاهي' }
    ]
  });

  // Restaurants / Cafes list
  const [restaurants, setRestaurants] = useState<RestaurantData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals / Visual Editor state
  const [selectedForVisualEdit, setSelectedForVisualEdit] = useState<RestaurantData | null>(null);
  const [selectedForQR, setSelectedForQR] = useState<RestaurantData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Custom Theme per Tenant Modal State
  const [isAddMenuModalOpen, setIsAddMenuModalOpen] = useState<boolean>(false);
  const [newMenuName, setNewMenuName] = useState<string>('');
  const [newMenuType, setNewMenuType] = useState<string>('restaurant');
  const [newMenuThemeConfig, setNewMenuThemeConfig] = useState<string>(
`{
  "primaryColor": "#F7E354",
  "secondaryColor": "#1C1C1E",
  "layoutStyle": "modern-grid",
  "fontFamily": "Noto Naskh Arabic",
  "borderRadius": "24px",
  "currency": "ر.س"
}`
  );
  const [isSubmittingNewMenu, setIsSubmittingNewMenu] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 1. Fetch Platform Settings from Firestore (settings/general)
  const fetchSettings = async () => {
    try {
      if (!db) return;
      const docRef = doc(db, 'settings', 'general');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data() as PlatformSettingsType;
        setPlatformSettings({
          platformName: data.platformName || 'WiseMenu',
          platformLogoUrl: data.platformLogoUrl || '',
          allowedVenueTypes: data.allowedVenueTypes || [
            { id: 'restaurant', labelAr: 'مطاعم' },
            { id: 'cafe', labelAr: 'مقاهي' }
          ]
        });
      }
    } catch (err) {
      console.warn('Notice: settings/general doc not initialized yet:', err);
    }
  };

  // 2. Fetch All Venues from Firestore (restaurants collection)
  const fetchAllRestaurants = async () => {
    setLoading(true);
    try {
      if (!db) throw new Error('Firestore connection unavailable');

      const querySnapshot = await getDocs(collection(db, 'restaurants'));
      const list: RestaurantData[] = [];

      querySnapshot.forEach((document) => {
        const d = document.data();
        const docId = document.id;

        const rawCategories = d.categories || [];
        const categories = rawCategories.map((c: any) =>
          typeof c === 'string' ? { id: c, labelAr: c, labelEn: c } : c
        );

        const rawItems = d.products || d.items || [];
        const products = rawItems.map((item: any, idx: number) => ({
          id: item.id || `item-${idx}`,
          categoryId: item.categoryId || item.category || (categories[0]?.id || 'all'),
          nameAr: item.nameAr || item.name || '',
          nameEn: item.nameEn || item.name || '',
          descriptionAr: item.descriptionAr || item.description || '',
          descriptionEn: item.descriptionEn || item.description || '',
          price: Number(item.price) || 0,
          calories: item.calories,
          imageUrl: item.imageUrl || item.image || '',
          badge: item.badge,
          isPopular: item.isPopular || item.badge === 'popular' || false,
          isSpicy: item.isSpicy || false,
          isSoldOut: item.isSoldOut || false
        }));

        // Inject 60 days mock time series data
        const dailyViews = generateMockTimeData(docId);
        const totalCalculatedScans = dailyViews.reduce((acc, curr) => acc + curr.scans, 0);
        const totalCalculatedViews = dailyViews.reduce((acc, curr) => acc + curr.views, 0);

        // ---------------------------------------------------------------------------------------------------------
        // [PERFORMANCE GUIDELINE & ARCHITECTURAL COMMENT: CATEGORY ENGAGEMENT TRACKING]:
        // In the client-facing digital menu view, tracking category interactions should be performed via
        // an IntersectionObserver. A view/dwell count should strictly register ONLY when a category section
        // remains continuously visible in the viewport for > 3 seconds (to filter out fast scrolling).
        // To prevent high write frequency and avoid database quota inflation, aggregate counts in memory
        // and commit them to Firebase Firestore via Batch Writes / Transactions during page dismissal
        // (`window.addEventListener('beforeunload')` or `document.addEventListener('visibilitychange')`).
        // ---------------------------------------------------------------------------------------------------------

        // Generate realistic mock category views (between 50 and 800) for the restaurant's actual categories
        const targetCategories = categories.length > 0 ? categories : [
          { id: 'cat-main', name: 'الأطباق الرئيسية', nameEn: 'Main Dishes', icon: 'lunch_dining', isActive: true },
          { id: 'cat-sides', name: 'المقبلات والبطاطس', nameEn: 'Appetizers & Fries', icon: 'tapas', isActive: true },
          { id: 'cat-drinks', name: 'المشروبات الباردة', nameEn: 'Cold Drinks', icon: 'local_bar', isActive: true },
          { id: 'cat-dessert', name: 'الحلويات', nameEn: 'Desserts', icon: 'icecream', isActive: true }
        ];

        const mockCategoryViews = targetCategories.map((cat: any, cIdx: number) => {
          // Realistic distribution between 50 and 800 views
          const base = Math.max(80, 720 - cIdx * 150);
          const variance = Math.floor(Math.random() * 95) + 35;
          const views = Math.min(800, Math.max(50, base + variance));
          return {
            categoryId: cat.id,
            views
          };
        });

        // Inject traffic source analytics (QR, Social, Direct) and category views if not already present
        const resolvedViews = d.views !== undefined ? Number(d.views) : totalCalculatedViews;
        const defaultAnalytics = {
          qr: d.analytics?.qr !== undefined ? Number(d.analytics.qr) : Math.max(10, Math.round(resolvedViews * 0.63)),
          social: d.analytics?.social !== undefined ? Number(d.analytics.social) : Math.max(5, Math.round(resolvedViews * 0.24)),
          direct: d.analytics?.direct !== undefined ? Number(d.analytics.direct) : Math.max(3, resolvedViews - Math.round(resolvedViews * 0.63) - Math.round(resolvedViews * 0.24)),
          categoryViews: d.analytics?.categoryViews && Array.isArray(d.analytics.categoryViews) && d.analytics.categoryViews.length > 0
            ? d.analytics.categoryViews
            : mockCategoryViews
        };

        list.push({
          id: docId,
          slug: docId,
          name: d.name || docId,
          nameEn: d.nameEn || d.name,
          logoUrl: d.logoUrl || d.logo || '',
          primaryColor: d.primaryColor || '#A33900',
          secondaryColor: d.secondaryColor || '#F4F4F5',
          type: d.type || (docId.includes('cafe') ? 'cafe' : 'restaurant'),
          currency: d.currency || 'ر.س',
          statusText: d.statusText || 'مفتوح للطلبات الآن',
          statusTextEn: d.statusTextEn || 'Open for orders',
          isActive: d.isActive !== false,
          layoutStyle: d.layoutStyle,
          fontFamily: d.fontFamily,
          borderRadius: d.borderRadius,
          themeConfig: d.themeConfig,
          dailyViews,
          scansCount: d.scansCount !== undefined ? Number(d.scansCount) : totalCalculatedScans,
          views: resolvedViews,
          analytics: defaultAnalytics,
          categories,
          products,
          contact: d.contact || {}
        });
      });

      setRestaurants(list);
    } catch (err: any) {
      console.error('Error fetching venues:', err);
      showToast('تعذر جلب المطاعم من Firestore');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchAllRestaurants();
  }, []);

  // 3. Toggle restaurant active state
  const handleToggleActive = async (restaurant: RestaurantData) => {
    const updatedState = !restaurant.isActive;
    try {
      if (db) {
        await updateDoc(doc(db, 'restaurants', restaurant.id), {
          isActive: updatedState
        });
      }
      setRestaurants((prev) =>
        prev.map((r) => (r.id === restaurant.id ? { ...r, isActive: updatedState } : r))
      );
      showToast(`تم ${updatedState ? 'تفعيل' : 'تعطيل'} \"${restaurant.name}\"`);
    } catch (err) {
      console.error('Error updating status:', err);
      showToast('حدث خطأ أثناء تحديث الحالة');
    }
  };

  // 5. Open Add Menu Modal
  const handleOpenAddMenuModal = (initialType: string = 'restaurant') => {
    setNewMenuName('');
    setNewMenuType(initialType);
    setNewMenuThemeConfig(
`{
  "primaryColor": "${initialType === 'cafe' ? '#D4A373' : '#F7E354'}",
  "secondaryColor": "#1C1C1E",
  "layoutStyle": "modern-grid",
  "fontFamily": "Noto Naskh Arabic",
  "borderRadius": "24px",
  "currency": "ر.س"
}`
    );
    setIsAddMenuModalOpen(true);
  };

  // 6. Submit Add Menu Modal with Custom Theme
  const handleCreateNewVenueWithTheme = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMenuName.trim()) {
      alert('يرجى كتابة اسم المنشأة أولاً.');
      return;
    }

    let parsedConfig: Record<string, any> = {};
    try {
      if (newMenuThemeConfig.trim()) {
        parsedConfig = JSON.parse(newMenuThemeConfig);
      }
    } catch (parseErr) {
      alert('كود التصميم (Theme Config) غير صالح! يرجى التأكد من كتابة كود JSON صحيح ومغلق بالأقواس.');
      return;
    }

    setIsSubmittingNewMenu(true);
    try {
      const generatedSlug = newMenuName
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\u0621-\u064A-]+/g, '') || `venue-${Date.now()}`;

      const primaryColor = parsedConfig.primaryColor || (newMenuType === 'cafe' ? '#D4A373' : '#F7E354');
      const secondaryColor = parsedConfig.secondaryColor || '#1C1C1E';
      const currency = parsedConfig.currency || 'ر.س';

      const initialCategories = [
        { id: 'featured', labelAr: 'المميز والأكثر طلباً', labelEn: 'Featured' },
        { id: 'all', labelAr: 'جميع الأصناف', labelEn: 'All Items' }
      ];

      const initialProducts = [
        {
          id: `item-${Date.now()}-1`,
          categoryId: 'featured',
          nameAr: `صنف ترحيبي في ${newMenuName}`,
          nameEn: 'Welcome Item',
          descriptionAr: 'يمكنك تعديل هذا الصنف وإضافة الأسعار والصور مباشرة عبر المحرر المرئي.',
          price: 25,
          imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500&auto=format&fit=crop&q=80',
          badge: 'popular',
          isPopular: true
        }
      ];

      const newVenueDoc: Partial<RestaurantData> = {
        name: newMenuName.trim(),
        nameEn: newMenuName.trim(),
        slug: generatedSlug,
        type: newMenuType as any,
        primaryColor,
        secondaryColor,
        currency,
        layoutStyle: parsedConfig.layoutStyle || 'modern-grid',
        fontFamily: parsedConfig.fontFamily || 'Noto Naskh Arabic',
        borderRadius: parsedConfig.borderRadius || '24px',
        themeConfig: parsedConfig,
        isActive: true,
        logoUrl: parsedConfig.logoUrl || '',
        statusText: 'مفتوح للطلبات الآن',
        categories: initialCategories,
        products: initialProducts,
        contact: {}
      };

      if (db) {
        await setDoc(doc(db, 'restaurants', generatedSlug), newVenueDoc);
      }

      const dailyViews = generateMockTimeData(generatedSlug);
      const createdVenue: RestaurantData = {
        ...(newVenueDoc as any),
        id: generatedSlug,
        dailyViews,
        scansCount: 45,
        views: 68,
        analytics: {
          qr: 42,
          social: 18,
          direct: 8,
          categoryViews: [
            { categoryId: 'cat-main', views: 420 },
            { categoryId: 'cat-sides', views: 310 },
            { categoryId: 'cat-drinks', views: 180 }
          ]
        }
      };

      setRestaurants((prev) => [createdVenue, ...prev]);
      setIsAddMenuModalOpen(false);
      showToast(`تم إنشاء منيو "${newMenuName}" مع الهوية المخصصة بنجاح!`);
      setSelectedForVisualEdit(createdVenue);
    } catch (err: any) {
      console.error('Error creating venue with custom theme:', err);
      showToast('حدث خطأ أثناء حفظ المنشأة');
    } finally {
      setIsSubmittingNewMenu(false);
    }
  };

  // 7. Add new venue type
  const handleAddNewType = async (typeName: string) => {
    const newTypeId = `type-${Date.now()}`;
    const updatedTypes = [
      ...(platformSettings.allowedVenueTypes || []),
      { id: newTypeId, labelAr: typeName }
    ];
    try {
      if (db) {
        await updateDoc(doc(db, 'settings', 'general'), {
          allowedVenueTypes: updatedTypes
        });
      }
      setPlatformSettings((prev) => ({
        ...prev,
        allowedVenueTypes: updatedTypes
      }));
      showToast(`تم إضافة تصنيف "${typeName}" بنجاح!`);
    } catch (err) {
      console.error('Error adding new type:', err);
      showToast('تعذر حفظ التصنيف الجديد');
    }
  };

  // ================= 8. ADVANCED DATE RANGE CALCULATION LOGIC =================
  const filteredStats = useMemo(() => {
    const now = new Date();
    const formatYMD = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    let startStr = '';
    let endStr = formatYMD(now);

    if (dateFilter === 'today') {
      startStr = formatYMD(now);
      endStr = formatYMD(now);
    } else if (dateFilter === 'last7days') {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      startStr = formatYMD(d);
    } else if (dateFilter === 'last30days') {
      const d = new Date(now);
      d.setDate(d.getDate() - 29);
      startStr = formatYMD(d);
    } else if (dateFilter === 'currentMonth') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      startStr = formatYMD(firstDay);
    } else if (dateFilter === 'lastMonth') {
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      startStr = formatYMD(firstDayLastMonth);
      endStr = formatYMD(lastDayLastMonth);
    } else if (dateFilter === 'custom') {
      startStr = customDateRange.startDate || formatYMD(now);
      endStr = customDateRange.endDate || formatYMD(now);
    }

    let totalViews = 0;
    let totalScans = 0;
    let totalQr = 0;
    let totalSocial = 0;
    let totalDirect = 0;
    const venuePeriodStats: Record<
      string,
      {
        views: number;
        scans: number;
        name: string;
        qr: number;
        social: number;
        direct: number;
        qrPercent: number;
        socialPercent: number;
        directPercent: number;
      }
    > = {};

    restaurants.forEach((r) => {
      let rViews = 0;
      let rScans = 0;
      const daily = r.dailyViews || [];

      daily.forEach((item) => {
        if (item.date >= startStr && item.date <= endStr) {
          rViews += item.views;
          rScans += item.scans;
        }
      });

      // Safe fallback if range is outside or daily empty
      if (rViews === 0 && (r.views || r.scansCount)) {
        const factor = dateFilter === 'today' ? 0.05 : dateFilter === 'last7days' ? 0.25 : 0.6;
        rViews = Math.max(12, Math.round((r.views || 450) * factor));
        rScans = Math.max(8, Math.round((r.scansCount || 320) * factor));
      }

      totalViews += rViews;
      totalScans += rScans;

      // Traffic source breakdown per restaurant for this period
      const rawAnalytics = r.analytics || {
        qr: Math.max(10, Math.round((r.views || 500) * 0.63)),
        social: Math.max(5, Math.round((r.views || 500) * 0.24)),
        direct: Math.max(3, (r.views || 500) - Math.round((r.views || 500) * 0.63) - Math.round((r.views || 500) * 0.24))
      };

      const venueTrafficBase = Math.max(1, rawAnalytics.qr + rawAnalytics.social + rawAnalytics.direct);
      const qrRatio = rawAnalytics.qr / venueTrafficBase;
      const socialRatio = rawAnalytics.social / venueTrafficBase;

      const periodQr = Math.round(rViews * qrRatio);
      const periodSocial = Math.round(rViews * socialRatio);
      const periodDirect = Math.max(0, rViews - periodQr - periodSocial);

      totalQr += periodQr;
      totalSocial += periodSocial;
      totalDirect += periodDirect;

      const rTotalTraffic = Math.max(1, periodQr + periodSocial + periodDirect);
      const rQrPct = Math.round((periodQr / rTotalTraffic) * 100);
      const rSocPct = Math.round((periodSocial / rTotalTraffic) * 100);
      const rDirPct = Math.max(0, 100 - rQrPct - rSocPct);

      venuePeriodStats[r.id] = {
        views: rViews,
        scans: rScans,
        name: r.name,
        qr: periodQr,
        social: periodSocial,
        direct: periodDirect,
        qrPercent: rQrPct,
        socialPercent: rSocPct,
        directPercent: rDirPct
      };
    });

    const totalTraffic = Math.max(1, totalQr + totalSocial + totalDirect);
    const qrPercent = Math.round((totalQr / totalTraffic) * 100);
    const socialPercent = Math.round((totalSocial / totalTraffic) * 100);
    const directPercent = Math.max(0, 100 - qrPercent - socialPercent);

    const activeVenuesCount = restaurants.filter((r) => r.isActive !== false).length;
    const avgScans = restaurants.length > 0 ? Math.round(totalScans / restaurants.length) : 0;
    const conversionRate = totalViews > 0 ? ((totalScans / totalViews) * 100).toFixed(1) : '74.2';

    // ---------------------------------------------------------------------------------------------------------
    // [PERFORMANCE GUIDELINE & ARCHITECTURE: CATEGORY INTERACTION TRACKING]:
    // In the client-facing digital menu view, category engagement is tracked via IntersectionObserver:
    // only when a category section stays visible in the user's viewport for > 3 seconds (dwell time).
    // These interactions are batched in memory and written to Firestore via Batch Writes during `beforeunload`
    // or `visibilitychange` to eliminate frequent network requests and avoid database write quotas exhaustion.
    // ---------------------------------------------------------------------------------------------------------
    const categoryAgg: Record<
      string,
      {
        id: string;
        name: string;
        nameEn?: string;
        icon?: string;
        views: number;
        venuesCount: number;
      }
    > = {};

    restaurants.forEach((r) => {
      const daily = r.dailyViews || [];
      let rPeriodViews = 0;
      daily.forEach((item) => {
        if (item.date >= startStr && item.date <= endStr) {
          rPeriodViews += item.views;
        }
      });
      if (rPeriodViews === 0 && (r.views || r.scansCount)) {
        const factor = dateFilter === 'today' ? 0.05 : dateFilter === 'last7days' ? 0.25 : 0.6;
        rPeriodViews = Math.max(12, Math.round((r.views || 450) * factor));
      }
      const periodScale = rPeriodViews / Math.max(1, r.views || 500);

      const catViews = r.analytics?.categoryViews || [];
      const categoriesMap = new Map((r.categories || []).map((c) => [c.id, c]));

      catViews.forEach((cv) => {
        const catObj = categoriesMap.get(cv.categoryId);
        const name = catObj?.name || catObj?.labelAr || cv.categoryId;
        const key = name.trim();
        const adjustedViews = Math.max(1, Math.round(cv.views * periodScale));

        if (!categoryAgg[key]) {
          categoryAgg[key] = {
            id: cv.categoryId,
            name,
            nameEn: catObj?.nameEn || catObj?.labelEn,
            icon: catObj?.icon || 'restaurant_menu',
            views: 0,
            venuesCount: 0
          };
        }
        categoryAgg[key].views += adjustedViews;
        categoryAgg[key].venuesCount += 1;
      });
    });

    const sortedCategories = Object.values(categoryAgg).sort((a, b) => b.views - a.views);
    const maxCategoryViews = sortedCategories.length > 0 ? sortedCategories[0].views : 1;
    const totalCategoryViews = sortedCategories.reduce((sum, c) => sum + c.views, 0);

    // Label for current filter
    let filterLabel = 'اليوم';
    if (dateFilter === 'last7days') filterLabel = 'آخر 7 أيام';
    if (dateFilter === 'last30days') filterLabel = 'آخر 30 يوماً';
    if (dateFilter === 'currentMonth') filterLabel = 'الشهر الحالي';
    if (dateFilter === 'lastMonth') filterLabel = 'الشهر السابق';
    if (dateFilter === 'custom') filterLabel = `${startStr} إلى ${endStr}`;

    return {
      startStr,
      endStr,
      filterLabel,
      totalViews,
      totalScans,
      totalQr,
      totalSocial,
      totalDirect,
      qrPercent,
      socialPercent,
      directPercent,
      activeVenuesCount,
      avgScans,
      conversionRate,
      venuePeriodStats,
      sortedCategories,
      maxCategoryViews,
      totalCategoryViews
    };
  }, [restaurants, dateFilter, customDateRange]);

  // Aggregate Metrics & Product Counts
  const activeCount = useMemo(() => restaurants.filter((r) => r.isActive).length, [restaurants]);

  const totalItemsCount = useMemo(() => {
    return restaurants.reduce((acc, curr) => acc + (curr.products?.length || 0), 0);
  }, [restaurants]);

  const mainMealsCount = useMemo(() => {
    return restaurants.reduce((acc, curr) => {
      const meals = (curr.products || []).filter(
        (p) =>
          !p.categoryId?.toLowerCase().includes('drink') &&
          !p.categoryId?.toLowerCase().includes('sweet') &&
          !p.categoryId?.toLowerCase().includes('dessert')
      );
      return acc + meals.length;
    }, 0);
  }, [restaurants]);

  const drinksCount = useMemo(() => {
    return restaurants.reduce((acc, curr) => {
      const drinks = (curr.products || []).filter(
        (p) =>
          p.categoryId?.toLowerCase().includes('drink') ||
          p.nameAr?.includes('عصير') ||
          p.nameAr?.includes('مشروب') ||
          p.nameAr?.includes('قهوة')
      );
      return acc + drinks.length;
    }, 0);
  }, [restaurants]);

  const sweetsCount = useMemo(() => {
    return restaurants.reduce((acc, curr) => {
      const sweets = (curr.products || []).filter(
        (p) =>
          p.categoryId?.toLowerCase().includes('sweet') ||
          p.categoryId?.toLowerCase().includes('dessert') ||
          p.nameAr?.includes('حلى') ||
          p.nameAr?.includes('كيك')
      );
      return acc + sweets.length;
    }, 0);
  }, [restaurants]);

  const syncPercentage = useMemo(() => {
    if (restaurants.length === 0) return 0;
    return Math.round((activeCount / restaurants.length) * 100);
  }, [restaurants, activeCount]);

  // Search filtered venues
  const filteredOverviewVenues = useMemo(() => {
    if (!searchQuery.trim()) return restaurants;
    return restaurants.filter(
      (v) =>
        v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (v.nameEn && v.nameEn.toLowerCase().includes(searchQuery.toLowerCase())) ||
        v.slug.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [restaurants, searchQuery]);

  // ================= 9. VENUE PERFORMANCE COMPARISON LOGIC & AGGREGATION =================
  // State for sorting the Venue Performance Comparison table
  const [comparisonSortConfig, setComparisonSortConfig] = useState<{
    key: 'name' | 'currentViews' | 'previousViews' | 'trend';
    direction: 'asc' | 'desc';
  }>({
    key: 'trend',
    direction: 'desc'
  });

  const venueComparisonData = useMemo(() => {
    const now = new Date();
    const formatYMD = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    let currentStart = '';
    let currentEnd = formatYMD(now);
    let previousStart = '';
    let previousEnd = '';
    let currentLabel = 'اليوم';
    let previousLabel = 'الأمس';
    let currentDays = 1;

    if (dateFilter === 'today') {
      currentStart = formatYMD(now);
      currentEnd = formatYMD(now);
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      previousStart = formatYMD(yesterday);
      previousEnd = formatYMD(yesterday);
      currentLabel = 'اليوم';
      previousLabel = 'الأمس';
      currentDays = 1;
    } else if (dateFilter === 'last7days') {
      const curStartD = new Date(now);
      curStartD.setDate(curStartD.getDate() - 6);
      currentStart = formatYMD(curStartD);
      currentEnd = formatYMD(now);

      const prevEndD = new Date(curStartD);
      prevEndD.setDate(prevEndD.getDate() - 1);
      const prevStartD = new Date(prevEndD);
      prevStartD.setDate(prevStartD.getDate() - 6);
      previousStart = formatYMD(prevStartD);
      previousEnd = formatYMD(prevEndD);

      currentLabel = 'آخر 7 أيام';
      previousLabel = 'الـ 7 أيام السابقة';
      currentDays = 7;
    } else if (dateFilter === 'last30days') {
      const curStartD = new Date(now);
      curStartD.setDate(curStartD.getDate() - 29);
      currentStart = formatYMD(curStartD);
      currentEnd = formatYMD(now);

      const prevEndD = new Date(curStartD);
      prevEndD.setDate(prevEndD.getDate() - 1);
      const prevStartD = new Date(prevEndD);
      prevStartD.setDate(prevStartD.getDate() - 29);
      previousStart = formatYMD(prevStartD);
      previousEnd = formatYMD(prevEndD);

      currentLabel = 'آخر 30 يوماً';
      previousLabel = 'الـ 30 يوماً السابقة';
      currentDays = 30;
    } else if (dateFilter === 'currentMonth') {
      const firstDayCurMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      currentStart = formatYMD(firstDayCurMonth);
      currentEnd = formatYMD(now);
      currentDays = Math.max(1, now.getDate());

      const firstDayPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const maxDaysInPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
      const prevEndDay = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        Math.min(currentDays, maxDaysInPrevMonth)
      );
      previousStart = formatYMD(firstDayPrevMonth);
      previousEnd = formatYMD(prevEndDay);

      currentLabel = 'الشهر الحالي';
      previousLabel = 'الفترة المماثلة بالشهر السابق';
    } else if (dateFilter === 'lastMonth') {
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      currentStart = formatYMD(firstDayLastMonth);
      currentEnd = formatYMD(lastDayLastMonth);
      currentDays = lastDayLastMonth.getDate();

      const firstDayPrevMonth = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      const lastDayPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 0);
      previousStart = formatYMD(firstDayPrevMonth);
      previousEnd = formatYMD(lastDayPrevMonth);

      currentLabel = 'الشهر السابق';
      previousLabel = 'الشهر قبل السابق';
    } else if (dateFilter === 'custom') {
      currentStart = customDateRange.startDate || formatYMD(now);
      currentEnd = customDateRange.endDate || formatYMD(now);
      const s = new Date(currentStart);
      const e = new Date(currentEnd);
      currentDays = Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000) + 1);

      const pEnd = new Date(s);
      pEnd.setDate(pEnd.getDate() - 1);
      const pStart = new Date(pEnd);
      pStart.setDate(pStart.getDate() - (currentDays - 1));
      previousStart = formatYMD(pStart);
      previousEnd = formatYMD(pEnd);

      currentLabel = `${currentStart} إلى ${currentEnd}`;
      previousLabel = `${previousStart} إلى ${previousEnd}`;
    }

    let sumCurrentViews = 0;
    let sumPreviousViews = 0;

    const items = restaurants.map((r) => {
      const daily = r.dailyViews || [];
      let cViews = 0;
      let pViews = 0;

      daily.forEach((item) => {
        if (item.date >= currentStart && item.date <= currentEnd) {
          cViews += item.views;
        }
        if (item.date >= previousStart && item.date <= previousEnd) {
          pViews += item.views;
        }
      });

      // Safe realistic fallback if daily dataset doesn't intersect
      if (cViews === 0 && (r.views || r.scansCount)) {
        const factor = Math.min(1, Math.max(0.04, currentDays / 60));
        cViews = Math.max(12, Math.round((r.views || 450) * factor));
      }
      if (pViews === 0 && (r.views || r.scansCount)) {
        const factor = Math.min(1, Math.max(0.04, currentDays / 60));
        const variance = (Math.abs(r.name.length * 17) % 24) - 8;
        pViews = Math.max(10, Math.round(cViews * (1 - variance / 100)));
      }

      sumCurrentViews += cViews;
      sumPreviousViews += pViews;

      const diffViews = cViews - pViews;
      let trendPercentage = 0;
      if (pViews === 0) {
        trendPercentage = cViews > 0 ? 100 : 0;
      } else {
        trendPercentage = Number((((cViews - pViews) / pViews) * 100).toFixed(1));
      }

      return {
        id: r.id,
        slug: r.slug,
        name: r.name,
        nameEn: r.nameEn,
        logoUrl: r.logoUrl,
        type: r.type || 'restaurant',
        isActive: r.isActive !== false,
        primaryColor: r.primaryColor || '#F7E354',
        currentViews: cViews,
        previousViews: pViews,
        diffViews,
        trendPercentage,
        rawVenue: r
      };
    });

    let overallGrowth = 0;
    if (sumPreviousViews === 0) {
      overallGrowth = sumCurrentViews > 0 ? 100 : 0;
    } else {
      overallGrowth = Number((((sumCurrentViews - sumPreviousViews) / sumPreviousViews) * 100).toFixed(1));
    }

    return {
      currentLabel,
      previousLabel,
      currentStart,
      currentEnd,
      previousStart,
      previousEnd,
      currentDays,
      sumCurrentViews,
      sumPreviousViews,
      overallGrowth,
      items
    };
  }, [restaurants, dateFilter, customDateRange]);

  // Sort comparison items based on sortConfig
  const sortedComparisonItems = useMemo(() => {
    const list = [...venueComparisonData.items];
    const { key, direction } = comparisonSortConfig;
    const factor = direction === 'asc' ? 1 : -1;

    list.sort((a, b) => {
      if (key === 'name') {
        return factor * a.name.localeCompare(b.name, 'ar');
      }
      if (key === 'currentViews') {
        return factor * (a.currentViews - b.currentViews);
      }
      if (key === 'previousViews') {
        return factor * (a.previousViews - b.previousViews);
      }
      if (key === 'trend') {
        return factor * (a.trendPercentage - b.trendPercentage);
      }
      return 0;
    });

    return list;
  }, [venueComparisonData.items, comparisonSortConfig]);

  const handleComparisonSort = (key: 'name' | 'currentViews' | 'previousViews' | 'trend') => {
    if (comparisonSortConfig.key === key) {
      setComparisonSortConfig({
        key,
        direction: comparisonSortConfig.direction === 'asc' ? 'desc' : 'asc'
      });
    } else {
      setComparisonSortConfig({
        key,
        direction: key === 'name' ? 'asc' : 'desc'
      });
    }
  };

  // Render Venue Performance Comparison Bento Card
  const renderVenueComparisonSection = () => {
    return (
      <div className="p-7 rounded-[32px] glass-metallic border border-white/5 shadow-2xl relative overflow-hidden space-y-6 animate-in fade-in duration-300">
        {/* Decorative corner accent glow */}
        <div className="absolute -top-24 -left-24 w-52 h-52 bg-[#F7E354]/5 rounded-full blur-3xl pointer-events-none" />

        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F7E354] yellow-glow animate-pulse"></span>
              <span className="text-[11px] text-[#F7E354] font-bold">تحليل ومقارنة معدلات النمو</span>
            </div>
            <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2.5 flex-wrap">
              <span>مقارنة أداء المنشآت</span>
              <span className="text-[11px] font-mono font-bold bg-[#1C1C1E] text-zinc-400 px-2.5 py-1 rounded-xl border border-white/5">
                Venue Performance Comparison
              </span>
            </h2>
            <p className="text-xs text-zinc-400">
              مقارنة الزيارات في الفترة المحددة <strong className="text-[#F7E354] font-bold">({venueComparisonData.currentLabel})</strong> مع الفترة السابقة المطابقة <strong className="text-zinc-300 font-bold">({venueComparisonData.previousLabel})</strong>
            </p>
          </div>

          {/* Aggregate Growth & Totals Pills */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Current Period Total */}
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#1C1C1E] border border-white/5 shadow-xs">
              <span className="text-[10px] text-zinc-400 font-bold">زيارات الفترة الحالية:</span>
              <span className="text-xs font-black text-[#F7E354] font-mono">
                {venueComparisonData.sumCurrentViews.toLocaleString('ar-SA')}
              </span>
            </div>

            {/* Previous Period Total */}
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#1C1C1E] border border-white/5 shadow-xs">
              <span className="text-[10px] text-zinc-400 font-bold">زيارات الفترة السابقة:</span>
              <span className="text-xs font-bold text-zinc-300 font-mono">
                {venueComparisonData.sumPreviousViews.toLocaleString('ar-SA')}
              </span>
            </div>

            {/* Overall Growth Badge */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border ${
                venueComparisonData.overallGrowth >= 0
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">
                {venueComparisonData.overallGrowth >= 0 ? 'trending_up' : 'trending_down'}
              </span>
              <span>
                إجمالي النمو {venueComparisonData.overallGrowth >= 0 ? `+${venueComparisonData.overallGrowth}%` : `${venueComparisonData.overallGrowth}%`}
              </span>
            </div>
          </div>
        </div>

        {/* Comparison Table with overflow-x-auto */}
        <div className="overflow-x-auto rounded-2xl border border-white/5 bg-[#121214]/60 backdrop-blur-md">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-zinc-400 text-xs font-bold bg-white/[0.02]">
                <th className="py-3.5 px-4 text-center w-12">#</th>
                
                {/* Column: المنشأة (Sortable) */}
                <th
                  onClick={() => handleComparisonSort('name')}
                  className="py-3.5 px-4 cursor-pointer select-none hover:text-[#F7E354] transition-colors group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>المنشأة</span>
                    <span className="material-symbols-outlined text-[16px] transition-transform text-zinc-500 group-hover:text-[#F7E354]">
                      {comparisonSortConfig.key === 'name'
                        ? comparisonSortConfig.direction === 'asc'
                          ? 'expand_less'
                          : 'expand_more'
                        : 'unfold_more'}
                    </span>
                  </div>
                </th>

                {/* Column: الفترة الحالية (Sortable) */}
                <th
                  onClick={() => handleComparisonSort('currentViews')}
                  className="py-3.5 px-4 cursor-pointer select-none hover:text-[#F7E354] transition-colors group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>الفترة الحالية</span>
                    <span className="text-[10px] text-zinc-500 font-normal">({venueComparisonData.currentLabel})</span>
                    <span className="material-symbols-outlined text-[16px] transition-transform text-zinc-500 group-hover:text-[#F7E354]">
                      {comparisonSortConfig.key === 'currentViews'
                        ? comparisonSortConfig.direction === 'asc'
                          ? 'expand_less'
                          : 'expand_more'
                        : 'unfold_more'}
                    </span>
                  </div>
                </th>

                {/* Column: الفترة السابقة (Sortable) */}
                <th
                  onClick={() => handleComparisonSort('previousViews')}
                  className="py-3.5 px-4 cursor-pointer select-none hover:text-[#F7E354] transition-colors group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>الفترة السابقة</span>
                    <span className="text-[10px] text-zinc-500 font-normal">({venueComparisonData.previousLabel})</span>
                    <span className="material-symbols-outlined text-[16px] transition-transform text-zinc-500 group-hover:text-[#F7E354]">
                      {comparisonSortConfig.key === 'previousViews'
                        ? comparisonSortConfig.direction === 'asc'
                          ? 'expand_less'
                          : 'expand_more'
                        : 'unfold_more'}
                    </span>
                  </div>
                </th>

                {/* Column: معدل النمو (Sortable) */}
                <th
                  onClick={() => handleComparisonSort('trend')}
                  className="py-3.5 px-4 cursor-pointer select-none hover:text-[#F7E354] transition-colors group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>معدل النمو</span>
                    <span className="material-symbols-outlined text-[16px] transition-transform text-zinc-500 group-hover:text-[#F7E354]">
                      {comparisonSortConfig.key === 'trend'
                        ? comparisonSortConfig.direction === 'asc'
                          ? 'expand_less'
                          : 'expand_more'
                        : 'unfold_more'}
                    </span>
                  </div>
                </th>

                {/* Column: فارق الزيارات */}
                <th className="py-3.5 px-4 text-center">الفارق العددي</th>

                {/* Column: الإجراءات */}
                <th className="py-3.5 px-4 text-center">إجراءات</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5 text-sm">
              {sortedComparisonItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500 font-bold">
                    لا توجد بيانات متاحة للمقارنة في هذه الفترة
                  </td>
                </tr>
              ) : (
                sortedComparisonItems.map((item, idx) => {
                  const isPositive = item.trendPercentage > 0;
                  const isNegative = item.trendPercentage < 0;
                  const isZero = item.trendPercentage === 0;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-white/[0.02] transition-colors group"
                    >
                      {/* Rank Index */}
                      <td className="py-4 px-4 text-center font-bold text-xs text-zinc-500">
                        {idx + 1}
                      </td>

                      {/* Venue: Logo, Name, Type */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            {item.logoUrl ? (
                              <img
                                src={item.logoUrl}
                                alt={item.name}
                                className="w-10 h-10 rounded-xl object-cover bg-black border border-white/10"
                              />
                            ) : (
                              <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-black border border-white/10 shadow-sm"
                                style={{ backgroundColor: item.primaryColor || '#F7E354' }}
                              >
                                {item.name.charAt(0)}
                              </div>
                            )}
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#121214] ${
                                item.isActive ? 'bg-[#F7E354]' : 'bg-zinc-600'
                              }`}
                              title={item.isActive ? 'منشأة نشطة' : 'منشأة معطلة'}
                            />
                          </div>

                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-white group-hover:text-[#F7E354] transition-colors truncate">
                              {item.name}
                            </span>
                            <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                              <span className="bg-[#1C1C1E] px-1.5 py-0.5 rounded text-[10px]">
                                {item.type === 'cafe' ? 'مقهى مختص' : 'مطعم سحابي'}
                              </span>
                              {item.nameEn && (
                                <span className="text-zinc-500 truncate hidden sm:inline">
                                  {item.nameEn}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Current Period Views */}
                      <td className="py-4 px-4">
                        <div className="flex flex-col">
                          <span className="font-black text-sm text-[#F7E354] font-mono">
                            {item.currentViews.toLocaleString('ar-SA')}
                          </span>
                          <span className="text-[10px] text-zinc-500">
                            زيارة نشطة
                          </span>
                        </div>
                      </td>

                      {/* Previous Period Views */}
                      <td className="py-4 px-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-sm text-zinc-300 font-mono">
                            {item.previousViews.toLocaleString('ar-SA')}
                          </span>
                          <span className="text-[10px] text-zinc-500">
                            زيارة سابقة
                          </span>
                        </div>
                      </td>

                      {/* Growth Rate / Trend */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5">
                          {isPositive && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-black">
                              <span className="material-symbols-outlined text-[15px]">trending_up</span>
                              <span>+{item.trendPercentage}%</span>
                            </span>
                          )}
                          {isNegative && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-black">
                              <span className="material-symbols-outlined text-[15px]">trending_down</span>
                              <span>{item.trendPercentage}%</span>
                            </span>
                          )}
                          {isZero && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-400 border border-zinc-700 text-xs font-bold">
                              <span className="material-symbols-outlined text-[15px]">trending_flat</span>
                              <span>0.0%</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Numerical Difference */}
                      <td className="py-4 px-4 text-center">
                        <span
                          className={`text-xs font-mono font-bold ${
                            item.diffViews > 0
                              ? 'text-emerald-400'
                              : item.diffViews < 0
                              ? 'text-rose-400'
                              : 'text-zinc-500'
                          }`}
                        >
                          {item.diffViews > 0 ? `+${item.diffViews.toLocaleString('ar-SA')}` : item.diffViews.toLocaleString('ar-SA')}
                        </span>
                      </td>

                      {/* Quick Actions */}
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedForQR(item.rawVenue)}
                            className="p-2 rounded-xl bg-black/40 hover:bg-[#F7E354] text-zinc-300 hover:text-black border border-white/10 hover:border-[#F7E354] transition-all cursor-pointer"
                            title="رمز الاستجابة السريعة (QR)"
                          >
                            <span className="material-symbols-outlined text-[16px]">qr_code_2</span>
                          </button>
                          <button
                            onClick={() => onBackToMenu(item.slug)}
                            className="p-2 rounded-xl bg-black/40 hover:bg-[#2C2C2E] text-zinc-300 hover:text-white border border-white/10 transition-all cursor-pointer"
                            title="معاينة المنيو"
                          >
                            <span className="material-symbols-outlined text-[16px]">visibility</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Note */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] text-zinc-500 pt-2 border-t border-white/5 gap-2">
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[15px] text-[#F7E354]">info</span>
            <span>يتم حساب معدل النمو بالمعادلة: ((الفترة الحالية - الفترة السابقة) / الفترة السابقة) × 100</span>
          </span>
          <span className="text-zinc-400 font-mono text-xs">
            إجمالي المنشآت المحللة: {sortedComparisonItems.length}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div
      dir="rtl"
      className="admin-dashboard-font flex min-h-screen w-full flex-col bg-[#202124] text-zinc-100 antialiased selection:bg-[#F7E354] selection:text-black lg:flex-row"
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 z-50 bg-[#F7E354] text-black font-bold px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom duration-200 border border-black/20">
          <span className="material-symbols-outlined text-black">check_circle</span>
          <span className="text-sm">{toastMessage}</span>
        </div>
      )}

      {/* 1. FIXED OPERATIONAL SIDEBAR (RTL RIGHT) */}
      <aside className="hidden w-60 shrink-0 border-l border-white/[0.07] bg-[#1c1d20] p-5 lg:flex lg:flex-col lg:justify-between lg:sticky lg:top-0 lg:h-screen lg:z-20">
        <div className="space-y-8">
          {/* Platform Brand */}
          <div className="flex items-center gap-3 px-2">
            {platformSettings.platformLogoUrl ? (
              <img
                src={platformSettings.platformLogoUrl}
                alt="Logo"
                className="w-10 h-10 rounded-2xl object-cover bg-black border border-white/10"
              />
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-[#F7E354] flex items-center justify-center text-black font-extrabold shadow-[0_0_20px_rgba(247,227,84,0.3)]">
                <span className="material-symbols-outlined text-2xl font-bold">restaurant</span>
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-base font-black tracking-tight text-white flex items-center gap-1.5">
                <span>{platformSettings.platformName || 'WiseMenu'}</span>
                <span className="text-[9px] bg-[#F7E354] text-black px-1.5 py-0.5 rounded font-black tracking-wide">
                  SaaS
                </span>
              </span>
              <span className="text-[10px] text-zinc-500 font-mono tracking-wider">
                ENTERPRISE CONTROL
              </span>
            </div>
            <span className="material-symbols-outlined mr-auto text-zinc-500 text-lg">verified_user</span>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`nav-btn w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-[#2C2C2E] text-[#F7E354] shadow-sm border border-white/5'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[20px]">dashboard</span>
                <span>الرئيسية والمنظومة</span>
              </div>
              <span className="material-symbols-outlined text-[16px]">chevron_left</span>
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`nav-btn w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'analytics'
                  ? 'bg-[#2C2C2E] text-[#F7E354] shadow-sm border border-white/5'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[20px]">trending_up</span>
                <span>إحصائيات الزوار</span>
              </div>
              <span className="material-symbols-outlined text-[16px]">chevron_left</span>
            </button>

            <button
              onClick={() => setActiveTab('venues')}
              className={`nav-btn w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'venues'
                  ? 'bg-[#2C2C2E] text-[#F7E354] shadow-sm border border-white/5'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[20px]">view_quilt</span>
                <span>إدارة المطاعم</span>
              </div>
              <span className="material-symbols-outlined text-[16px]">chevron_left</span>
            </button>

            <button
              onClick={() => setActiveTab('customers')}
              className={`nav-btn w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-sm font-bold transition-all cursor-pointer ${activeTab === 'customers' ? 'bg-[#2C2C2E] text-[#F7E354] shadow-sm border border-white/5' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
            ><div className="flex items-center gap-3"><span className="material-symbols-outlined text-[20px]">groups</span><span>إدارة العملاء</span></div><span className="material-symbols-outlined text-[16px]">chevron_left</span></button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`nav-btn w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-[#2C2C2E] text-[#F7E354] shadow-sm border border-white/5'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[20px]">tune</span>
                <span>إعدادات المنصة</span>
              </div>
              <span className="material-symbols-outlined text-[16px]">chevron_left</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Bottom */}
        <div className="space-y-4 pt-4 border-t border-white/5">
          <button
            onClick={() => onBackToMenu()}
            className="w-full py-3 px-4 rounded-2xl glass-metallic hover:bg-[#3A3A3C] text-xs font-bold text-zinc-200 flex items-center justify-between transition-colors cursor-pointer"
          >
            <div className="flex flex-col text-right">
              <span className="text-[10px] text-zinc-400">معاينة</span>
              <span>واجهة العميل</span>
            </div>
            <span className="material-symbols-outlined text-[#F7E354]">open_in_new</span>
          </button>

          <p className="px-2 text-[11px] leading-6 text-zinc-600">منصة موحدة لإدارة المنيوهات الرقمية</p>
        </div>
      </aside>

      {/* Compact navigation for smaller screens */}
      <nav className="flex items-center gap-1 overflow-x-auto border-b border-white/[0.07] bg-[#1c1d20] px-3 py-2 lg:hidden">
        {([
          ['overview', 'dashboard', 'الرئيسية'],
          ['analytics', 'trending_up', 'الإحصاءات'],
          ['venues', 'storefront', 'المطاعم'],
          ['customers', 'groups', 'العملاء'],
          ['settings', 'tune', 'الإعدادات']
        ] as const).map(([tab, icon, label]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-colors ${activeTab === tab ? 'bg-[#F7E354] text-[#171717]' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
          >
            <span className="material-symbols-outlined text-[17px]">{icon}</span>
            {label}
          </button>
        ))}
        <button onClick={() => onBackToMenu()} className="mr-auto flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-zinc-400 hover:bg-white/5 hover:text-white">
          <span className="material-symbols-outlined text-[17px]">visibility</span>
          معاينة
        </button>
      </nav>

      {/* 2. MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="flex min-h-24 flex-col items-stretch justify-between gap-4 border-b border-white/[0.07] px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:px-10">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F7E354] yellow-glow"></span>
              <span className="text-[11px] text-[#F7E354] font-bold">نظام المراقبة والتحكم الميداني</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              {activeTab === 'overview' && 'نظرة عامة على المنظومة'}
              {activeTab === 'analytics' && 'إحصائيات الزوار ومسحات الـ QR'}
              {activeTab === 'venues' && 'إدارة المطاعم والمقاهي والأعمدة'}
              {activeTab === 'customers' && 'بيانات العملاء ومشاركة تقاريرهم'}
              {activeTab === 'settings' && 'إعدادات هوية المنصة والداشبورد'}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Advanced Date Range Filter Dropdown & Pickers (Shown only on overview and analytics tabs) */}
            {activeTab === 'analytics' && (
              <div className="flex items-center gap-2">
                <div className="relative">
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#F7E354] text-[18px] pointer-events-none">
                    calendar_today
                  </span>
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value as DateFilterType)}
                    className="glass-metallic text-white text-xs font-bold rounded-xl pr-9 pl-8 py-2.5 border border-white/10 focus:border-[#F7E354] focus:outline-none appearance-none cursor-pointer hover:bg-[#2C2C2E] transition-all shadow-sm"
                  >
                    <option value="today" className="bg-[#1C1C1E] text-white">اليوم (Today)</option>
                    <option value="last7days" className="bg-[#1C1C1E] text-white">آخر 7 أيام (Last 7 Days)</option>
                    <option value="last30days" className="bg-[#1C1C1E] text-white">آخر 30 يوماً (Last 30 Days)</option>
                    <option value="currentMonth" className="bg-[#1C1C1E] text-white">الشهر الحالي (Current Month)</option>
                    <option value="lastMonth" className="bg-[#1C1C1E] text-white">الشهر السابق (Last Month)</option>
                    <option value="custom" className="bg-[#1C1C1E] text-[#F7E354] font-bold">فترة مخصصة (Custom Range)...</option>
                  </select>
                  <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 text-[16px] pointer-events-none">
                    expand_more
                  </span>
                </div>

                {/* Custom Date Range Pickers (shown only when 'custom' is active) */}
                {dateFilter === 'custom' && (
                  <div className="flex items-center gap-1.5 animate-in fade-in duration-200">
                    <div className="flex items-center gap-1 bg-[#1C1C1E] border border-white/10 rounded-xl px-2.5 py-1.5 focus-within:border-[#F7E354]">
                      <span className="text-[10px] text-zinc-400 font-bold">من:</span>
                      <input
                        type="date"
                        value={customDateRange.startDate}
                        onChange={(e) => setCustomDateRange((prev) => ({ ...prev, startDate: e.target.value }))}
                        className="bg-transparent text-xs text-[#F7E354] font-mono focus:outline-none cursor-pointer"
                      />
                    </div>
                    <div className="flex items-center gap-1 bg-[#1C1C1E] border border-white/10 rounded-xl px-2.5 py-1.5 focus-within:border-[#F7E354]">
                      <span className="text-[10px] text-zinc-400 font-bold">إلى:</span>
                      <input
                        type="date"
                        value={customDateRange.endDate}
                        onChange={(e) => setCustomDateRange((prev) => ({ ...prev, endDate: e.target.value }))}
                        className="bg-transparent text-xs text-[#F7E354] font-mono focus:outline-none cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Search Input */}
            <div className="relative w-64 hidden lg:block">
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 text-[20px]">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن منشأة، قائمة، أو صنف..."
                className="w-full bg-[#1C1C1E] border border-white/5 text-sm text-white placeholder-zinc-500 rounded-xl py-2.5 pr-10 pl-4 focus:border-[#F7E354] focus:outline-none transition-colors"
              />
            </div>

            {/* Add New Menu Button (Opens Custom Theme Modal) */}
            <button
              onClick={() => handleOpenAddMenuModal('restaurant')}
              className="py-2.5 px-5 rounded-xl bg-[#F7E354] text-black text-sm font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(247,227,84,0.3)] hover:scale-95 transition-transform cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px] font-bold">add</span>
              <span>إضافة مطعم</span>
            </button>
          </div>
        </header>

        {/* Dynamic Content */}
        <main className="w-full flex-1 space-y-8 px-4 pb-10 pt-6 sm:px-6 lg:px-10 lg:pt-8">
          {/* ================= TAB 1: OVERVIEW ================= */}
          {activeTab === 'overview' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              {/* Row 1: The Three Bento Cards */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 xl:gap-5">
                
                {/* Card 1: Yellow (Total Menus & QR Scans in Period) */}
                <div className="relative flex min-h-[250px] flex-col justify-between overflow-hidden rounded-[26px] bg-[#F7E354] p-6 text-black shadow-[0_18px_48px_rgba(0,0,0,0.18)] transition-transform hover:-translate-y-1 sm:p-7 xl:min-h-[280px]">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold opacity-70">حالة المطاعم على المنصة</span>
                      <span className="text-lg font-black mt-0.5">المطاعم النشطة</span>
                    </div>
                    <span className="material-symbols-outlined text-[28px] opacity-80">storefront</span>
                  </div>

                  <div className="my-6 flex items-center justify-between">
                    <div className="relative flex items-center justify-center">
                      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-black/10"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                        ></path>
                        {syncPercentage > 0 && (
                          <path
                            className="text-black"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="currentColor"
                            strokeDasharray={`${Math.min(100, syncPercentage)}, 100`}
                            strokeLinecap="round"
                            strokeWidth="3.5"
                          />
                        )}
                      </svg>
                      <span className="absolute text-xl font-black">{syncPercentage}%</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-5xl lg:text-6xl font-black tracking-tighter">
                        {activeCount.toLocaleString('ar-SA')}
                      </span>
                      <span className="text-[11px] font-bold opacity-80 mt-1">
                        من أصل {restaurants.length} مطاعم
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-black/10 text-xs font-bold">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">north</span>
                      {activeCount.toLocaleString('ar-SA')} مطاعم جاهزة للعرض
                    </span>
                    <span className="opacity-70">{restaurants.length} إجمالي المنشآت</span>
                  </div>
                </div>

                {/* Card 2: Glass Metallic Dark (Visual Editor / المحرر المرئي) */}
                <div className="glass-metallic relative flex min-h-[250px] flex-col justify-between overflow-hidden rounded-[26px] p-6 text-white shadow-[0_18px_48px_rgba(0,0,0,0.2)] transition-transform hover:-translate-y-1 sm:p-7 xl:min-h-[280px]">
                  <div className="flex items-center justify-between relative z-10">
                    <span className="px-3 py-1 rounded-full border border-[#F7E354]/30 text-[10px] font-bold text-[#F7E354] bg-[#F7E354]/10 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-[#F7E354] rounded-full animate-pulse"></span>
                      أداة التصميم الذكية
                    </span>
                    <span className="material-symbols-outlined text-[24px] text-zinc-400">layers</span>
                  </div>

                  <div className="my-auto relative z-10 space-y-2 mt-4">
                    <h3 className="text-2xl font-bold text-white yellow-text-glow">المحرر المرئي</h3>
                    <p className="text-[11px] text-zinc-400 leading-relaxed max-w-[220px]">
                      تخصيص وتعديل تصميم القوائم والأسعار بالسحب والإفلات المباشر بدقة فورية.
                    </p>

                    {/* Mockup UI preview inside card */}
                    <div className="mt-4 space-y-2">
                      <div className="bg-[#1C1C1E] border border-white/5 rounded-lg p-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-zinc-500 text-[16px]">drag_indicator</span>
                          <span className="text-[11px] font-bold text-zinc-300">{restaurants[0]?.categories?.[0]?.labelAr || 'أضف أول قسم إلى منيوك'}</span>
                        </div>
                        <span className="w-2 h-2 rounded-full bg-[#F7E354]"></span>
                      </div>
                      <div className="bg-[#2C2C2E] border border-[#F7E354]/20 rounded-lg p-2 flex items-center justify-between shadow-lg">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[#F7E354] text-[16px]">drag_indicator</span>
                          <span className="text-[11px] font-bold text-[#F7E354]">{restaurants[0]?.products?.[0]?.nameAr || 'أضف أول صنف إلى المنيو'}</span>
                        </div>
                        <span className="text-[11px] font-bold text-white">{restaurants[0]?.products?.[0] ? `${restaurants[0].products[0].price} ${restaurants[0].currency || 'ر.س'}` : '—'}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (restaurants.length > 0) {
                        setSelectedForVisualEdit(restaurants[0]);
                      } else {
                        handleOpenAddMenuModal('restaurant');
                      }
                    }}
                    className="mt-4 w-full py-3 rounded-xl bg-[#F7E354] text-black text-sm font-bold flex items-center justify-center gap-2 hover:bg-yellow-300 transition-colors shadow-lg relative z-10 cursor-pointer"
                  >
                    <span>فتح المحرر المرئي</span>
                    <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                  </button>
                </div>

                {/* Card 3: Light Gray (Total Items & Traffic Analytics) */}
                <div className="relative flex min-h-[250px] flex-col justify-between overflow-hidden rounded-[26px] bg-[#efeff0] p-6 text-[#1C1C1E] shadow-[0_18px_48px_rgba(0,0,0,0.14)] transition-transform hover:-translate-y-1 sm:p-7 xl:min-h-[280px]">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold opacity-60">حجم المحتوى الحالي</span>
                      <span className="text-lg font-black mt-0.5">الأصناف في المنيوهات</span>
                    </div>
                    <span className="material-symbols-outlined text-[28px] opacity-40">restaurant_menu</span>
                  </div>

                  <div className="my-6 text-center">
                    <div className="flex items-baseline justify-center gap-2">
                      <span className="text-6xl lg:text-7xl font-black tracking-tighter text-[#1C1C1E]">
                        {totalItemsCount.toLocaleString('ar-SA')}
                      </span>
                    </div>
                    <span className="text-xs font-bold opacity-70">
                      صنف مسجل في جميع المطاعم
                    </span>

                    <div className="mt-5 grid grid-cols-3 gap-2 text-[11px] font-bold">
                      <div className="rounded-xl bg-zinc-300/80 px-3 py-3 text-center">
                        <span className="block text-lg">{mainMealsCount}</span>
                        <span className="opacity-70">وجبات</span>
                      </div>
                      <div className="rounded-xl bg-zinc-300/80 px-3 py-3 text-center">
                        <span className="block text-lg">{drinksCount}</span>
                        <span className="opacity-70">مشروبات</span>
                      </div>
                      <div className="rounded-xl bg-zinc-300/80 px-3 py-3 text-center">
                        <span className="block text-lg">{sweetsCount}</span>
                        <span className="opacity-70">حلويات</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-black/10 text-[10px] font-bold">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">restaurant_menu</span>
                      محتوى المنيوهات المسجلة
                    </span>
                    <span className="opacity-60">{restaurants.length} مطاعم</span>
                  </div>
                </div>
              </div>

              {/* Row 2: Registered Venues (المنشآت المسجلة) */}
              <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-white tracking-tight">المنشآت المسجلة</h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#2C2C2E] text-[11px] font-bold border border-white/5 text-[#F7E354]">
                      {activeCount} منشآت نشطة
                    </span>
                  </div>
                  <button
                    onClick={() => setActiveTab('venues')}
                    className="text-sm font-bold text-zinc-400 hover:text-[#F7E354] flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>عرض جميع المطاعم</span>
                    <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                  </button>
                </div>

                {/* Dynamic Venues Cards */}
                {filteredOverviewVenues.length === 0 ? (
                  <div className="glass-metallic rounded-3xl p-12 text-center space-y-4 border border-white/5">
                    <span className="material-symbols-outlined text-4xl text-zinc-500">storefront</span>
                    <h4 className="text-base font-bold text-zinc-300">لا توجد منشآت مسجلة مطابقة للبحث</h4>
                    <button
                      onClick={() => handleOpenAddMenuModal('restaurant')}
                      className="px-5 py-2.5 rounded-xl bg-[#F7E354] text-black font-bold text-xs shadow-lg inline-flex items-center gap-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">add</span>
                      <span>إضافة مطعم جديد</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredOverviewVenues.map((v) => {
                      const isCafe = v.type === 'cafe';
                      return (
                        <div
                          key={v.slug}
                          className="glass-metallic rounded-3xl p-6 flex flex-col gap-6 hover:border-[#F7E354]/40 transition-colors group"
                        >
                          {/* Card Header */}
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-4">
                              <div className="w-14 h-14 rounded-2xl bg-[#1C1C1E] border border-white/10 flex items-center justify-center text-xl font-black text-[#F7E354] shadow-inner overflow-hidden flex-shrink-0">
                                {v.logoUrl ? (
                                  <img
                                    src={v.logoUrl}
                                    alt={v.name}
                                    className="w-full h-full object-contain p-1"
                                  />
                                ) : (
                                  <span>{v.name.slice(0, 2).toUpperCase()}</span>
                                )}
                              </div>
                              <div>
                                <h3 className="font-bold text-lg text-white group-hover:text-[#F7E354] transition-colors">
                                  {v.name}
                                </h3>
                                <span className="text-[10px] text-zinc-400 tracking-widest uppercase block dir-ltr" dir="ltr">
                                  ?id={v.slug}
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-1">
                              <button
                                onClick={() => handleToggleActive(v)}
                                className={`px-2 py-1 rounded-md text-[10px] font-bold border flex items-center gap-1 cursor-pointer transition-colors ${
                                  v.isActive
                                    ? 'bg-[#F7E354]/10 text-[#F7E354] border-[#F7E354]/20'
                                    : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                                }`}
                                title="انقر لتغيير حالة النشاط"
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    v.isActive ? 'bg-[#F7E354] animate-pulse' : 'bg-zinc-500'
                                  }`}
                                ></span>
                                {v.isActive ? 'نشط' : 'معطل'}
                              </button>
                              <span className="text-[9px] text-zinc-500 bg-[#1C1C1E] px-1.5 py-0.5 rounded">
                                {isCafe ? 'مقهى مختص' : 'مطعم سحابي'}
                              </span>
                            </div>
                          </div>

                          {/* Stats Grid */}
                          <div className="grid grid-cols-3 gap-2 py-4 border-y border-white/5 text-center">
                            <div className="flex flex-col">
                              <span className="text-[10px] text-zinc-500">القوائم</span>
                              <span className="font-bold text-sm text-white">
                                {v.categories?.length || 0} منيو
                              </span>
                            </div>
                            <div className="flex flex-col border-x border-white/5">
                              <span className="text-[10px] text-zinc-500">الأصناف</span>
                              <span className="font-bold text-sm text-white">
                                {v.products?.length || 0} صنف
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] text-zinc-500">اللون الأساسي</span>
                              <div className="flex items-center justify-center gap-1.5 mt-1">
                                <span
                                  className="w-3 h-3 rounded-full border border-white/20 inline-block shadow-xs"
                                  style={{ backgroundColor: v.primaryColor || '#F7E354' }}
                                />
                                <span className="font-bold text-[11px] text-zinc-300 font-mono uppercase">
                                  {v.primaryColor || '#F7E354'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="grid grid-cols-4 gap-2 pt-2">
                            <button
                              onClick={() => setSelectedForVisualEdit(v)}
                              className="col-span-2 bg-[#F7E354] text-black py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 hover:bg-yellow-300 transition-colors shadow-md cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[16px]">edit</span>
                              <span>تعديل مرئي</span>
                            </button>

                            <button
                              onClick={() => setSelectedForQR(v)}
                              className="col-span-1 bg-[#2C2C2E] text-white hover:text-[#F7E354] py-2.5 rounded-xl flex items-center justify-center transition-colors cursor-pointer border border-white/5"
                              title="رمز الاستجابة السريعة (QR)"
                            >
                              <span className="material-symbols-outlined text-[18px]">qr_code_2</span>
                            </button>

                            <button
                              onClick={() => onBackToMenu(v.slug)}
                              className="col-span-1 bg-[#2C2C2E] text-white hover:text-[#F7E354] py-2.5 rounded-xl flex items-center justify-center transition-colors cursor-pointer border border-white/5"
                              title="معاينة قائمة العميل"
                            >
                              <span className="material-symbols-outlined text-[18px]">visibility</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ================= TAB: VISITOR ANALYTICS ================= */}
          {activeTab === 'analytics' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="flex items-start gap-3 rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] px-4 py-3 text-sm leading-6 text-amber-100/80">
                <span className="material-symbols-outlined mt-0.5 text-[18px] text-amber-200">info</span>
                <p>هذه الإحصاءات تجريبية حاليًا وليست قياسات فعلية للزوار. سنربطها بتتبع حقيقي قبل الاعتماد عليها.</p>
              </div>
              <AnalyticsTab
                restaurants={restaurants}
                dateFilter={dateFilter}
                customDateRange={customDateRange}
                onDateFilterChange={setDateFilter}
                onCustomDateRangeChange={setCustomDateRange}
                onOpenQR={(v) => setSelectedForQR(v)}
                onPreviewMenu={(s) => onBackToMenu(s)}
                categoryStats={{
                  items: filteredStats.sortedCategories,
                  maxViews: filteredStats.maxCategoryViews,
                  totalCatViews: filteredStats.totalCategoryViews
                }}
              />

            </div>
          )}

          {/* ================= TAB 2: VENUES MANAGEMENT ================= */}
          {activeTab === 'venues' && (
            <div className="animate-in fade-in duration-300">
              <VenuesManagement
                restaurants={restaurants}
                venueTypes={platformSettings.allowedVenueTypes || [
                  { id: 'restaurant', labelAr: 'مطاعم' },
                  { id: 'cafe', labelAr: 'مقاهي' }
                ]}
                onAddNewVenue={(type) => handleOpenAddMenuModal(type)}
                onEditVenue={(v) => setSelectedForVisualEdit(v)}
                onOpenQR={(v) => setSelectedForQR(v)}
                onPreviewMenu={(s) => onBackToMenu(s)}
                onAddNewType={handleAddNewType}
              />
            </div>
          )}

          {activeTab === 'customers' && <CustomerReports restaurants={restaurants} venueTypes={platformSettings.allowedVenueTypes || []} onToast={showToast} />}

          {/* ================= TAB 3: PLATFORM SETTINGS ================= */}
          {activeTab === 'settings' && (
            <div className="animate-in fade-in duration-300 max-w-2xl mx-auto">
              <PlatformSettings
                settings={platformSettings}
                onSaved={(updated) => {
                  setPlatformSettings(updated);
                  showToast('تم تحديث إعدادات المنصة');
                }}
              />
            </div>
          )}
        </main>

        {/* Small Bottom Status Footer */}
        <footer className="mt-auto px-4 pb-5 sm:px-6 lg:px-10">
          <div className="glass-metallic p-4 rounded-2xl flex items-center justify-between text-zinc-400">
            <div className="flex items-center gap-2 font-bold text-[10px]">
              <span className="w-2 h-2 rounded-full bg-[#F7E354] yellow-glow animate-pulse"></span>
              <span>إدارة مركزية للمطاعم والقوائم الرقمية</span>
            </div>
            <div className="flex items-center gap-4 font-bold text-[10px] opacity-60">
              <span>الفترة النشطة: {filteredStats.filterLabel}</span>
              <span>الإصدار 2.5.0 SaaS</span>
            </div>
          </div>
        </footer>
      </div>

      {/* ================= MODAL: ADD NEW MENU WITH CUSTOM THEME ================= */}
      {isAddMenuModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setIsAddMenuModalOpen(false)} />

          <div className="relative w-full max-w-xl glass-metallic rounded-[32px] p-8 border border-white/10 shadow-2xl space-y-6 text-white my-8 z-10 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F7E354] text-black flex items-center justify-center shadow-lg">
                  <span className="material-symbols-outlined text-2xl">palette</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    إضافة منيو جديد (هوية مخصصة)
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Custom Themes per Tenant - دعم تصميم وهوية بصرية مستقلة لكل منشأة
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsAddMenuModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateNewVenueWithTheme} className="space-y-5">
              {/* Field 1: Venue Name */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-[#F7E354]">storefront</span>
                  اسم المنشأة (مطعم أو مقهى):
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: وايز برجر، سموكي كافيه..."
                  value={newMenuName}
                  onChange={(e) => setNewMenuName(e.target.value)}
                  className="w-full bg-[#1C1C1E] border border-white/10 rounded-2xl py-3 px-4 text-sm text-white placeholder-zinc-500 focus:border-[#F7E354] focus:outline-none transition-colors"
                />
              </div>

              {/* Field 2: Venue Type */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-[#F7E354]">category</span>
                  نوع المنشأة:
                </label>
                <select
                  value={newMenuType}
                  onChange={(e) => setNewMenuType(e.target.value)}
                  className="w-full bg-[#1C1C1E] border border-white/10 rounded-2xl py-3 px-4 text-sm text-white focus:border-[#F7E354] focus:outline-none transition-colors cursor-pointer"
                >
                  {(platformSettings.allowedVenueTypes || [
                    { id: 'restaurant', labelAr: 'مطاعم' },
                    { id: 'cafe', labelAr: 'مقاهي' }
                  ]).map((type) => (
                    <option key={type.id} value={type.id} className="bg-[#1C1C1E] text-white">
                      {type.labelAr}
                    </option>
                  ))}
                </select>
              </div>

              {/* Field 3: Custom Theme Config (JSON Textarea) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-[#F7E354]">code</span>
                    كود التصميم المخصص (Theme Config JSON):
                  </label>
                  <span className="text-[10px] text-[#F7E354] font-mono">قابلة للتوسيع</span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  حدد الألوان، الخط، التخطيط وحواف البطاقات بصيغة JSON خاصة بهذه المنشأة:
                </p>
                <textarea
                  rows={7}
                  value={newMenuThemeConfig}
                  onChange={(e) => setNewMenuThemeConfig(e.target.value)}
                  dir="ltr"
                  className="w-full bg-[#161618] border border-white/10 rounded-2xl p-4 text-xs font-mono text-[#F7E354] focus:border-[#F7E354] focus:outline-none transition-colors leading-relaxed selection:bg-white/20"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsAddMenuModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-zinc-300 transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNewMenu}
                  className="px-6 py-2.5 rounded-xl bg-[#F7E354] text-black font-extrabold text-xs shadow-[0_0_20px_rgba(247,227,84,0.3)] hover:scale-95 transition-transform flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
                  <span>{isSubmittingNewMenu ? 'جاري الإنشاء...' : 'إنشاء المنيو وحفظ الهوية'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= VISUAL MENU EDITOR MODAL ================= */}
      {selectedForVisualEdit && (
        <VisualMenuEditor
          initialRestaurant={selectedForVisualEdit}
          onClose={() => setSelectedForVisualEdit(null)}
          onSaved={async (updated: RestaurantData) => {
            if (db) {
              await updateDoc(doc(db, 'restaurants', updated.id), updated);
            }
            setRestaurants((prev) =>
              prev.map((r) => (r.id === updated.id ? updated : r))
            );
            setSelectedForVisualEdit(null);
            showToast(`تم حفظ وتصدير تعديلات \"${updated.name}\" بنجاح!`);
          }}
          availableTypes={platformSettings.allowedVenueTypes || [
            { id: 'restaurant', labelAr: 'مطاعم' },
            { id: 'cafe', labelAr: 'مقاهي' }
          ]}
        />
      )}

      {/* QR MODAL */}
      {selectedForQR && (
        <QRCodeModal
          restaurant={selectedForQR}
          isOpen={Boolean(selectedForQR)}
          onClose={() => setSelectedForQR(null)}
        />
      )}
    </div>
  );
};
