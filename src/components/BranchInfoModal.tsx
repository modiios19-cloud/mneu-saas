import { normalizePhone } from '../lib/phone';
import { safeWebUrl } from '../lib/contactLinks';
import React from 'react';
import { RestaurantData } from '../types/restaurant';
import { X, Clock, MapPin, Phone, ShieldCheck } from 'lucide-react';

interface BranchInfoModalProps {
  restaurant: RestaurantData;
  isOpen: boolean;
  onClose: () => void;
  lang: 'ar' | 'en';
}

export const BranchInfoModal: React.FC<BranchInfoModalProps> = ({
  restaurant,
  isOpen,
  onClose,
  lang
}) => {
  if (!isOpen) return null;

  const isAr = lang === 'ar';
  const { contact } = restaurant;
  const primaryColor = restaurant.primaryColor || '#A33900';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl z-10 space-y-6 animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-1 rounded-full text-zinc-400 hover:text-[#111111] hover:bg-zinc-100 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Branch Title & Badge */}
        <div className="text-center pt-2">
          {restaurant.logoUrl && (
            <img
              src={restaurant.logoUrl}
              alt={restaurant.name}
              className="w-12 h-12 object-contain mx-auto mb-2"
            />
          )}
          <h3 className="text-lg font-extrabold text-[#111111]">
            {restaurant.name}
          </h3>
          <div className="inline-flex items-center gap-1.5 mt-1.5 px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              {isAr
                ? restaurant.statusText || 'مفتوح للطلبات الآن'
                : restaurant.statusTextEn || 'Open for orders'}
            </span>
          </div>
        </div>

        {/* Hours & Location list */}
        <div className="space-y-3.5 text-xs">
          {(contact.workingHoursAr || contact.workingHoursEn) && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-zinc-50 border border-zinc-100">
              <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: primaryColor }} />
              <div>
                <p className="font-bold text-[#111111]">
                  {isAr ? 'ساعات العمل' : 'Working Hours'}
                </p>
                <p className="text-[#71717A] mt-0.5">
                  {isAr ? contact.workingHoursAr : (contact.workingHoursEn || contact.workingHoursAr)}
                </p>
              </div>
            </div>
          )}

          {(contact.locationNameAr || contact.locationNameEn) && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-zinc-50 border border-zinc-100">
              <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: primaryColor }} />
              <div>
                <p className="font-bold text-[#111111]">
                  {isAr ? 'الموقع والعنوان' : 'Location & Address'}
                </p>
                {safeWebUrl(contact.maps) ? <a href={safeWebUrl(contact.maps)} target="_blank" rel="noopener noreferrer" className="mt-0.5 block underline" style={{ color: primaryColor }}>{isAr ? contact.locationNameAr : (contact.locationNameEn || contact.locationNameAr)}</a> : <p className="text-[#71717A] mt-0.5">{isAr ? contact.locationNameAr : (contact.locationNameEn || contact.locationNameAr)}</p>}
              </div>
            </div>
          )}

          <div className="flex items-start gap-3 p-3 rounded-xl bg-zinc-50 border border-zinc-100">
            <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: primaryColor }} />
            <div>
              <p className="font-bold text-[#111111]">
                {isAr ? 'معايير الجودة' : 'Quality Commitment'}
              </p>
              <p className="text-[#71717A] mt-0.5">
                {isAr
                  ? 'مكونات طازجة يومياً، معايير نظافة وتحضير فائقة الدقة.'
                  : 'Fresh daily ingredients prepared under strict hygiene standards.'}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          {safeWebUrl(contact.maps) && (
            <a
              href={safeWebUrl(contact.maps)}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 px-3 rounded-xl border border-zinc-200 hover:text-white text-center text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = primaryColor;
                e.currentTarget.style.borderColor = primaryColor;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#FFFFFF';
                e.currentTarget.style.borderColor = '#E4E4E7';
              }}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>{isAr ? 'خرائط جوجل' : 'Google Maps'}</span>
            </a>
          )}
          {contact.phone && (
            <a
              href={`tel:${normalizePhone(contact.phone)}`}
              className="py-2.5 px-3 rounded-xl text-white text-center text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              style={{ backgroundColor: primaryColor }}
            >
              <Phone className="w-3.5 h-3.5" />
              <span>{isAr ? 'اتصال مباشر' : 'Call Branch'}</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
