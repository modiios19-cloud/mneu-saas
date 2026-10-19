import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { useRestaurant } from './hooks/useRestaurant';
import { Header } from './components/Header';
import { MenuItemCard } from './components/MenuItemCard';
import { SearchModal } from './components/SearchModal';
import { BranchInfoModal } from './components/BranchInfoModal';
import { Footer } from './components/Footer';
import { LoadingState } from './components/LoadingState';
import { ErrorState } from './components/ErrorState';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { Category, MenuItem } from './types/restaurant';
import { ShieldCheck, AlertCircle } from 'lucide-react';
import { auth } from './lib/firebase';
import { AdminLogin } from './components/AdminLogin';
import { PublicReport } from './components/PublicReport';

// Client-side convenience only; Firestore rules enforce this UID server-side.
const ADMIN_UID = 'VZMngh2pukhR8r2RoZpNIopt4R82';

// Helper to get slug from URL query params: ?id=xxx or ?restaurant=xxx or ?slug=xxx
function getInitialSlug(): string {
  if (typeof window === 'undefined') return 'backfries';
  const params = new URLSearchParams(window.location.search);
  const foundSlug = params.get('id') || params.get('restaurant') || params.get('slug');
  return foundSlug ? foundSlug.trim().toLowerCase() : 'backfries';
}

function getInitialView(): 'client' | 'admin' {
  if (typeof window === 'undefined') return 'client';
  const params = new URLSearchParams(window.location.search);
  return params.get('admin') === 'true' || params.get('view') === 'admin' ? 'admin' : 'client';
}

function buildStitchDocument(source: string, data: Record<string, unknown>): string {
  // Keep imported design code isolated from the dashboard's origin and Firebase session.
  const safeData = JSON.stringify(data).replace(/</g, '\\u003c');
  const bridge = `<script>window.MENU_DATA=${safeData};</script>`;
  const head = /<head[^>]*>/i;
  return head.test(source) ? source.replace(head, (match) => `${match}${bridge}`) : `${bridge}${source}`;
}

export default function App() {
  const [viewMode, setViewMode] = useState<'client' | 'admin'>(getInitialView);
  const [slug, setSlug] = useState<string>(getInitialSlug);
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isBranchInfoOpen, setIsBranchInfoOpen] = useState<boolean>(false);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const reportToken = typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('report');

  // Hook to fetch restaurant data dynamically from Firebase Firestore
  const { data: restaurant, loading, error, reload } = useRestaurant(slug);

  useEffect(() => onAuthStateChanged(auth, (user) => {
    setAuthUser(user);
    setAuthReady(true);
  }), []);

  const isAr = lang === 'ar';


  // Listen for browser navigation / popstate
  useEffect(() => {
    const handlePopState = () => {
      setSlug(getInitialSlug());
      setViewMode(getInitialView());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Update slug and browser URL query string
  const handleSelectSlug = (newSlug: string) => {
    const clean = newSlug.trim().toLowerCase();
    setSlug(clean);
    setActiveCategory('all');
    const url = new URL(window.location.href);
    url.searchParams.set('id', clean);
    url.searchParams.delete('admin');
    url.searchParams.delete('view');
    window.history.pushState({}, '', url.toString());
  };

  // Switch between client menu and admin dashboard
  const handleToggleView = (mode: 'client' | 'admin', targetSlug?: string) => {
    setViewMode(mode);
    const url = new URL(window.location.href);
    if (mode === 'admin') {
      url.searchParams.set('admin', 'true');
    } else {
      url.searchParams.delete('admin');
      url.searchParams.delete('view');
      if (targetSlug) {
        url.searchParams.set('id', targetSlug);
        setSlug(targetSlug);
      }
    }
    window.history.pushState({}, '', url.toString());
  };

  // Sync HTML title, meta, direction, and dynamic CSS variable for primaryColor
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

    if (viewMode === 'admin') {
      document.title = "لوحة تحكم المنصة | SaaS Admin Dashboard";
      return;
    }

    if (restaurant) {
      const primary = restaurant.primaryColor || '#A33900';
      document.documentElement.style.setProperty('--primary-color', primary);
      document.title = `${restaurant.name} | ${isAr ? 'القائمة الرقمية' : 'Digital Menu'}`;
    }
  }, [lang, restaurant, isAr, viewMode]);

  if (reportToken) return <PublicReport token={reportToken} />;

  // If in Admin Dashboard mode, render AdminDashboard
  if (viewMode === 'admin') {
    if (!authReady) return <LoadingState />;
    if (!authUser) return <AdminLogin lang={lang} />;
    if (authUser.uid !== ADMIN_UID) {
      return (
        <main dir={lang === 'ar' ? 'rtl' : 'ltr'} className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
          <section className="max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-7 text-center">
            <h1 className="text-xl font-bold">{lang === 'ar' ? 'لا تملك صلاحية الإدارة' : 'Admin access denied'}</h1>
            <p className="mt-2 text-sm text-zinc-400">{lang === 'ar' ? 'هذا الحساب غير معتمد لإدارة المنصة.' : 'This account is not authorized to manage the platform.'}</p>
            <button onClick={() => signOut(auth)} className="mt-5 rounded-lg bg-amber-400 px-4 py-2 font-bold text-zinc-950">{lang === 'ar' ? 'تسجيل الخروج' : 'Sign out'}</button>
          </section>
        </main>
      );
    }
    return (
      <>
        <div className="fixed bottom-3 left-3 z-[100]">
          <button onClick={() => signOut(auth)} className="rounded-lg border border-zinc-700 bg-zinc-950/90 px-3 py-2 text-xs font-bold text-white shadow-lg">
            {lang === 'ar' ? 'تسجيل الخروج' : 'Sign out'}
          </button>
        </div>
        <AdminDashboard onBackToMenu={(target) => handleToggleView('client', target)} lang={lang} />
      </>
    );
  }

  // Loading State
  if (loading) {
    return <LoadingState />;
  }

  // Error State
  if (error || !restaurant) {
    return (
      <ErrorState
        error={error || 'المطعم غير موجود في النظام'}
        currentSlug={slug}
        onRetry={reload}
        onSelectSlug={handleSelectSlug}
        onOpenAdmin={() => handleToggleView('admin')}
        lang={lang}
      />
    );
  }

  const primaryColor = restaurant.primaryColor || '#A33900';
  const currency = restaurant.currency || (isAr ? 'ر.س' : 'SAR');

  // Filter products by selected active category
  const categoriesWithProducts = restaurant.categories.map((cat: Category) => {
    if (cat.id === 'all') {
      return {
        ...cat,
        items: restaurant.products
      };
    }
    return {
      ...cat,
      items: restaurant.products.filter((p: MenuItem) => p.categoryId === cat.id)
    };
  });

  const visibleSections = activeCategory === 'all'
    ? categoriesWithProducts.filter((c) => c.id !== 'all' && c.items.length > 0)
    : categoriesWithProducts.filter((c) => c.id === activeCategory);

  if (restaurant.stitchDesignCode?.trim()) {
    const stitchData = {
      restaurant: {
        id: restaurant.id,
        slug: restaurant.slug,
        name: restaurant.name,
        nameEn: restaurant.nameEn,
        logoUrl: restaurant.logoUrl,
        primaryColor,
        secondaryColor: restaurant.secondaryColor,
        currency,
        type: restaurant.type,
        contact: restaurant.contact,
        statusText: restaurant.statusText
      },
      categories: restaurant.categories,
      products: restaurant.products,
      offers: restaurant.products.filter((item) => item.badge === 'offer'),
      updatedAt: restaurant.updatedAt || null
    };
    return (
      <iframe
        title={`منيو ${restaurant.name}`}
        className="block w-full min-h-screen border-0 bg-white"
        sandbox="allow-scripts allow-forms allow-popups"
        referrerPolicy="strict-origin-when-cross-origin"
        srcDoc={buildStitchDocument(restaurant.stitchDesignCode, stitchData)}
      />
    );
  }

  return (
    <div
      className="text-[#111111] flex flex-col min-h-screen bg-white font-sans"
      style={{
        '--color-brand': primaryColor,
        '--primary-color': primaryColor
      } as React.CSSProperties}
    >
      {/* Dynamic Tenant Switcher Bar with Admin Access */}
      <div className="bg-zinc-50 border-b border-zinc-200/80 px-4 py-1.5 text-[11px] text-[#71717A] flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#111111]">
            {isAr ? 'المطعم الحالي:' : 'Current Tenant:'}
          </span>
          <span
            className="font-mono px-2 py-0.5 rounded-md text-white font-bold text-[10px]"
            style={{ backgroundColor: primaryColor }}
          >
            {restaurant.slug}
          </span>

          {restaurant.isActive === false && (
            <span className="text-[10px] font-bold text-black bg-amber-400 px-2 py-0.5 rounded">
              معطل مؤقتاً
            </span>
          )}
        </div>

        {/* Action: Open Admin Dashboard & Seed & Demo Switchers */}
        <div className="flex items-center gap-2">
          {/* Admin Dashboard shortcut button */}
          <button
            onClick={() => handleToggleView('admin')}
            className="px-2.5 py-1 rounded-md bg-black hover:bg-zinc-900 text-amber-400 border border-amber-400/30 text-[10px] font-bold cursor-pointer transition-all shadow-xs flex items-center gap-1"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>لوحة الإدارة (Admin)</span>
          </button>

          <span className="text-[10px] text-zinc-300">|</span>

          <span className="text-[10px] text-zinc-400 hidden sm:inline">
            {isAr ? 'تبديل:' : 'Switch:'}
          </span>
          <button
            onClick={() => handleSelectSlug('backfries')}
            className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
              slug === 'backfries'
                ? 'bg-zinc-800 text-white'
                : 'bg-zinc-200/70 text-zinc-700 hover:bg-zinc-300'
            }`}
          >
            backfries
          </button>
          <button
            onClick={() => handleSelectSlug('burgerlab')}
            className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
              slug === 'burgerlab'
                ? 'bg-zinc-800 text-white'
                : 'bg-zinc-200/70 text-zinc-700 hover:bg-zinc-300'
            }`}
          >
            burgerlab
          </button>
        </div>
      </div>

      {/* Notice if restaurant is inactive */}
      {restaurant.isActive === false && (
        <div className="bg-red-500 text-white text-xs font-bold py-2 px-4 text-center flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>تنبيه: هذا المطعم غير نشط حالياً في لوحة الإدارة</span>
        </div>
      )}

      {/* Header with Dynamic Restaurant Name, Logo & Categories */}
      <Header
        restaurant={restaurant}
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
        onOpenSearch={() => setIsSearchOpen(true)}
        lang={lang}
        onToggleLang={() => setLang(lang === 'ar' ? 'en' : 'ar')}
        onOpenBranchInfo={() => setIsBranchInfoOpen(true)}
      />

      {/* Main Content Body */}
      <main className="flex-1 w-full max-w-xl mx-auto px-6 py-8 space-y-10">
        {visibleSections.length === 0 ? (
          <div className="py-16 text-center text-zinc-400">
            <p className="text-sm font-bold text-[#111111]">
              {isAr ? 'لا توجد منتجات مسجلة في هذا القسم' : 'No items found in this section'}
            </p>
          </div>
        ) : (
          visibleSections.map((section) => (
            <section
              key={section.id}
              className="menu-section space-y-4"
              data-category={section.id}
            >
              {/* Section Header */}
              <div className="flex items-baseline justify-between border-b border-[#F1F1F4] pb-3">
                <h2 className="text-xl font-bold tracking-tight text-[#111111]">
                  {isAr ? section.labelAr : (section.labelEn || section.labelAr)}
                </h2>
                {section.sublabelEn && (
                  <span className="text-xs font-medium text-[#71717A] font-en tracking-wider uppercase">
                    {section.sublabelEn}
                  </span>
                )}
              </div>

              {/* Items List (Presentation Only - No Plus Buttons) */}
              <div className="divide-y divide-transparent">
                {section.items.map((item: MenuItem) => (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    currency={currency}
                    lang={lang}
                    primaryColor={primaryColor}
                  />
                ))}
              </div>
            </section>
          ))
        )}

        {/* Footer with Dynamic Contact Icons & Copyright */}
        <Footer
          contact={restaurant.contact}
          restaurantName={restaurant.name}
          primaryColor={primaryColor}
          lang={lang}
        />
      </main>

      {/* Modals */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        products={restaurant.products}
        categories={restaurant.categories}
        currency={currency}
        primaryColor={primaryColor}
        lang={lang}
      />

      <BranchInfoModal
        restaurant={restaurant}
        isOpen={isBranchInfoOpen}
        onClose={() => setIsBranchInfoOpen(false)}
        lang={lang}
      />
    </div>
  );
}
