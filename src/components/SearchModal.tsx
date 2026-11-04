import React, { useState, useMemo } from 'react';
import { MenuItem, Category } from '../types/restaurant';
import { X, Search } from 'lucide-react';
import { MenuItemCard } from './MenuItemCard';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: MenuItem[];
  categories: Category[];
  currency?: string;
  primaryColor?: string;
  lang: 'ar' | 'en';
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  products,
  categories,
  currency = 'ر.س',
  primaryColor = '#A33900',
  lang
}) => {
  if (!isOpen) return null;

  const isAr = lang === 'ar';
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategoryId, setActiveCategoryId] = useState<string>('all');

  const filteredItems = useMemo(() => {
    return products.filter((item) => {
      // Category filter
      if (activeCategoryId !== 'all' && item.categoryId !== activeCategoryId) {
        return false;
      }

      // Search term
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      const matchAr =
        item.nameAr?.toLowerCase().includes(term) ||
        item.descriptionAr?.toLowerCase().includes(term);
      const matchEn =
        item.nameEn?.toLowerCase().includes(term) ||
        item.descriptionEn?.toLowerCase().includes(term);
      return matchAr || matchEn;
    });
  }, [products, searchTerm, activeCategoryId]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-xl bg-white sm:rounded-2xl h-full sm:h-auto sm:max-h-[85vh] flex flex-col shadow-2xl z-10 animate-in slide-in-from-top duration-300">
        {/* Search Header */}
        <div className="p-4 border-b border-[#F1F1F4] flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 right-3 text-zinc-400" />
            <input
              autoFocus
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={
                isAr
                  ? 'ابحث في قائمة الطعام...'
                  : 'Search menu items...'
              }
              className="w-full pl-9 pr-9 py-2.5 rounded-full border border-zinc-200 text-xs focus:outline-none bg-zinc-50 focus:bg-white transition-all"
              style={{
                borderColor: searchTerm ? primaryColor : undefined
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute top-1/2 -translate-y-1/2 left-3 text-zinc-400 hover:text-zinc-600 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-xs font-bold text-[#71717A] hover:text-[#111111] px-2 py-1 cursor-pointer"
          >
            {isAr ? 'إلغاء' : 'Cancel'}
          </button>
        </div>

        {/* Quick Filter Badges from Dynamic Categories */}
        <div className="px-4 py-2.5 overflow-x-auto no-scrollbar flex items-center gap-2 border-b border-[#F1F1F4]/80 text-xs">
          <button
            onClick={() => setActiveCategoryId('all')}
            className="px-3 py-1 rounded-full whitespace-nowrap transition-colors cursor-pointer text-xs"
            style={{
              backgroundColor: activeCategoryId === 'all' ? primaryColor : '#F4F4F5',
              color: activeCategoryId === 'all' ? '#FFFFFF' : '#71717A',
              fontWeight: activeCategoryId === 'all' ? 700 : 500
            }}
          >
            {isAr ? 'الكل' : 'All'}
          </button>

          {categories
            .filter((c) => c.id !== 'all')
            .map((cat) => {
              const isSelected = activeCategoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategoryId(cat.id)}
                  className="px-3 py-1 rounded-full whitespace-nowrap transition-colors cursor-pointer text-xs"
                  style={{
                    backgroundColor: isSelected ? primaryColor : '#F4F4F5',
                    color: isSelected ? '#FFFFFF' : '#71717A',
                    fontWeight: isSelected ? 700 : 500
                  }}
                >
                  {isAr ? cat.labelAr : (cat.labelEn || cat.labelAr)}
                </button>
              );
            })}
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-4">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 mb-2">
                <Search className="w-6 h-6 stroke-[1.5]" />
              </span>
              <p className="text-sm font-bold text-[#111111]">
                {isAr ? 'لا توجد نتائج مطابقة' : 'No matching results'}
              </p>
              <p className="text-xs text-[#71717A] mt-1">
                {isAr
                  ? 'جرب البحث بكلمة أخرى أو تصفح الأقسام'
                  : 'Try searching with a different term'}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="text-[11px] text-[#A1A1AA] pb-1 px-1">
                {isAr
                  ? `تم العثور على ${filteredItems.length} صنف`
                  : `Found ${filteredItems.length} items`}
              </div>
              {filteredItems.map((item) => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  currency={currency}
                  lang={lang}
                  primaryColor={primaryColor}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

