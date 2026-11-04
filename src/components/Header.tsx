import React from 'react';
import { Search, Globe } from 'lucide-react';
import { RestaurantData, Category } from '../types/restaurant';

interface HeaderProps {
  restaurant: RestaurantData;
  activeCategory: string;
  onSelectCategory: (id: string) => void;
  onOpenSearch: () => void;
  lang: 'ar' | 'en';
  onToggleLang: () => void;
  onOpenBranchInfo: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  restaurant,
  activeCategory,
  onSelectCategory,
  onOpenSearch,
  lang,
  onToggleLang,
  onOpenBranchInfo
}) => {
  const isAr = lang === 'ar';
  const primaryColor = restaurant.primaryColor || '#A33900';

  return (
    <header className="sticky top-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md pt-safe border-b border-[#F1F1F4]/80 transition-all shadow-xs">
      {/* Top Utility Bar: Working hours, language toggle, search */}
      <div className="max-w-xl mx-auto px-4 pt-2.5 pb-1 flex items-center justify-between text-xs text-[#71717A]">
        {/* Status indicator */}
        <button
          onClick={onOpenBranchInfo}
          className="flex items-center gap-1.5 hover:text-[#111111] transition-colors py-1 px-2 rounded-full hover:bg-zinc-100 cursor-pointer"
          title={isAr ? "معلومات الفرع وأوقات العمل" : "Branch info and hours"}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-medium text-[11px] text-[#111111]">
            {isAr
              ? restaurant.statusText || 'مفتوح للطلبات الآن'
              : restaurant.statusTextEn || 'Open now'}
          </span>
        </button>

        {/* Right utility buttons */}
        <div className="flex items-center gap-1">
          {/* Search Trigger */}
          <button
            onClick={onOpenSearch}
            className="p-1.5 rounded-full text-[#111111] hover:bg-zinc-100 transition-colors cursor-pointer"
            aria-label={isAr ? "البحث في القائمة" : "Search menu"}
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Language Switcher */}
          <button
            onClick={onToggleLang}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold text-[#111111] hover:bg-zinc-100 transition-colors cursor-pointer"
            aria-label="Switch Language"
          >
            <Globe className="w-3.5 h-3.5" style={{ color: primaryColor }} />
            <span className="font-en">{lang === 'ar' ? 'EN' : 'عربي'}</span>
          </button>
        </div>
      </div>

      {/* Main Brand Logo & Title */}
      <div className="py-3 max-w-xl mx-auto px-6 flex flex-col items-center justify-center text-center gap-1">
        {restaurant.logoUrl && (
          <img
            alt={restaurant.name}
            className="h-10 w-auto object-contain transition-transform hover:scale-105 duration-300"
            src={restaurant.logoUrl || undefined}
          />
        )}
        <span className="font-en text-[17px] font-extrabold tracking-widest text-[#111111] uppercase">
          {restaurant.name}
        </span>
      </div>

      {/* Dynamic Category Tabs with Thin Underline Indicator */}
      <nav className="max-w-xl mx-auto px-6 overflow-x-auto no-scrollbar flex items-center gap-8 text-[15px] border-t border-[#F1F1F4]/80">
        {restaurant.categories.map((cat: Category) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`category-tab relative py-3.5 whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? 'active-tab font-bold text-[#111111]'
                  : 'font-medium text-[#71717A] hover:text-[#111111]'
              }`}
            >
              {isAr ? cat.labelAr : (cat.labelEn || cat.labelAr)}
              {isActive && (
                <span
                  className="indicator absolute bottom-0 inset-x-0 h-[2px] rounded-full transition-all duration-300"
                  style={{ backgroundColor: primaryColor }}
                />
              )}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
