import React from 'react';
import { MenuItem } from '../types/restaurant';

interface MenuItemCardProps {
  item: MenuItem;
  currency?: string;
  lang?: 'ar' | 'en';
  primaryColor?: string;
}

export const MenuItemCard: React.FC<MenuItemCardProps> = ({
  item,
  currency = 'ر.س',
  lang = 'ar',
  primaryColor = 'var(--primary-color, #A33900)'
}) => {
  const isAr = lang === 'ar';
  const title = isAr ? item.nameAr : (item.nameEn || item.nameAr);
  const description = isAr ? item.descriptionAr : (item.descriptionEn || item.descriptionAr);

  // Badge label and styling
  const renderBadge = () => {
    if (item.isSoldOut || item.badge === 'soldout') {
      return (
        <span className="absolute top-1 right-1 bg-zinc-800 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-xs">
          {isAr ? 'نفدت الكمية' : 'Sold Out'}
        </span>
      );
    }
    if (item.badge === 'offer') {
      return (
        <span className="absolute top-1 right-1 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-xs">
          {isAr ? 'عرض خاص' : 'Special Offer'}
        </span>
      );
    }
    if (item.badge === 'new') {
      return (
        <span className="absolute top-1 right-1 bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-xs">
          {isAr ? 'جديد ✨' : 'New ✨'}
        </span>
      );
    }
    if (item.isPopular || item.badge === 'popular') {
      return (
        <span
          className="absolute top-1 right-1 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-xs"
          style={{ backgroundColor: primaryColor }}
        >
          {isAr ? 'الأكثر طلباً ⭐' : 'Best Seller ⭐'}
        </span>
      );
    }
    return null;
  };

  return (
    <article
      className={`menu-item-card group flex items-start gap-4 py-4 border-b border-[#F1F1F4]/80 rounded-lg transition-colors hover:bg-zinc-50/50 ${
        item.isSoldOut ? 'opacity-60 grayscale-[0.3]' : ''
      }`}
    >
      {/* Food Thumbnail */}
      <div className="w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden bg-zinc-100 relative shadow-2xs">
        <img
          alt={title}
          src={item.imageUrl}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {renderBadge()}
        {item.isSpicy && (
          <span className="absolute bottom-1 right-1 bg-red-600/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-xs">
            🌶️
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch">
        <div>
          {/* Header row: Title and Price */}
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-sm font-bold text-[#111111] leading-snug">
              {title}
            </h3>
            <span
              className="text-sm font-extrabold font-en whitespace-nowrap"
              style={{ color: primaryColor }}
            >
              {item.price} {currency}
            </span>
          </div>

          {/* Description */}
          <p className="text-xs text-[#71717A] font-normal leading-relaxed mt-1 line-clamp-2">
            {description}
          </p>
        </div>

        {/* Calories if provided */}
        {item.calories ? (
          <div className="mt-1 flex items-center gap-2">
            <span className="text-[11px] text-[#A1A1AA] font-en">
              {item.calories} {isAr ? 'سعرة' : 'kcal'}
            </span>
            {item.isSoldOut && (
              <span className="text-[10px] text-red-600 font-bold bg-red-50 px-1.5 py-0.5 rounded">
                {isAr ? 'غير متاح حالياً' : 'Currently Unavailable'}
              </span>
            )}
          </div>
        ) : null}
      </div>
    </article>
  );
};
