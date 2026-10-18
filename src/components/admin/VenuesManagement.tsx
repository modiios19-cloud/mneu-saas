import React, { useState } from 'react';
import { RestaurantData } from '../../types/restaurant';
import {
  Store,
  Coffee,
  Plus,
  Edit3,
  QrCode,
  ExternalLink,
  Utensils,
  Search
} from 'lucide-react';

interface VenuesManagementProps {
  restaurants: RestaurantData[];
  venueTypes: { id: string; labelAr: string }[];
  onAddNewVenue: (type?: string) => void;
  onEditVenue: (restaurant: RestaurantData) => void;
  onOpenQR: (restaurant: RestaurantData) => void;
  onPreviewMenu: (slug: string) => void;
  onAddNewType: (typeName: string) => void;
}

export const VenuesManagement: React.FC<VenuesManagementProps> = ({
  restaurants,
  venueTypes,
  onAddNewVenue,
  onEditVenue,
  onOpenQR,
  onPreviewMenu,
  onAddNewType
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const handlePromptNewType = () => {
    const name = prompt('أدخل اسم التصنيف الجديد (مثلاً: حلويات، عصائر ومشروبات، مخابز):');
    if (name && name.trim()) {
      onAddNewType(name.trim());
    }
  };

  const getVenuesForType = (typeId: string) => {
    return restaurants.filter((r) => {
      const matchesSearch = !searchQuery.trim() ||
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.slug.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // Default to 'restaurant' if no type is set
      const rType = r.type || 'restaurant';
      return rType === typeId;
    });
  };

  return (
    <div className="space-y-6">
      {/* Search and Quick Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 right-3.5 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث عن منيو بالاسم أو المعرّف (Slug)..."
            className="w-full pr-10 pl-4 py-2.5 rounded-2xl border border-zinc-200 text-xs focus:outline-none focus:border-black bg-white shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Button to add a new category / type */}
          <button
            type="button"
            onClick={handlePromptNewType}
            className="py-2.5 px-4 rounded-2xl bg-black hover:bg-zinc-900 text-amber-400 border border-amber-400/20 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>إضافة تصنيف جديد (مثل حلويات...)</span>
          </button>
        </div>
      </div>

      {/* DYNAMIC CATEGORY COLUMNS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 divide-y lg:divide-y-0 lg:divide-x lg:divide-x-reverse divide-zinc-200">
        {venueTypes.map((type, idx) => {
          const venues = getVenuesForType(type.id);
          const isCafe = type.id === 'cafe';

          return (
            <div
              key={type.id}
              className={`space-y-4 ${idx > 0 ? 'pt-8 lg:pt-0 lg:pr-8' : ''}`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 border-b border-zinc-200/80">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-black shadow-2xs ${
                      isCafe ? 'bg-amber-400' : 'bg-black text-amber-400 border border-amber-400/30'
                    }`}
                  >
                    {isCafe ? <Coffee className="w-4 h-4" /> : <Store className="w-4 h-4" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-black">
                      قسم: {type.labelAr}
                    </h3>
                    <p className="text-[11px] text-zinc-500 font-medium">
                      {venues.length} قوائم مسجلة
                    </p>
                  </div>
                </div>

                {/* Add new venue to this category */}
                <button
                  type="button"
                  onClick={() => onAddNewVenue(type.id)}
                  className="py-1.5 px-3 rounded-xl bg-black hover:bg-zinc-900 text-amber-400 border border-amber-400/30 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-400" />
                  <span>إضافة {type.labelAr === 'مقاهي' ? 'مقهى' : 'مطعم'}</span>
                </button>
              </div>

              {/* Venues in this Column */}
              {venues.length === 0 ? (
                <div className="p-8 rounded-2xl bg-white border border-dashed border-zinc-200 text-center space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-zinc-100 text-zinc-400 flex items-center justify-center mx-auto">
                    {isCafe ? <Coffee className="w-5 h-5" /> : <Store className="w-5 h-5" />}
                  </div>
                  <p className="text-xs text-zinc-600 font-medium">
                    لا توجد قوائم طعام مسجلة في قسم "{type.labelAr}"
                  </p>
                  <button
                    onClick={() => onAddNewVenue(type.id)}
                    className="text-xs font-bold text-black hover:text-amber-500 hover:underline cursor-pointer"
                  >
                    + اضغط هنا لإنشاء أول قائمة في هذا القسم
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {venues.map((venue) => {
                    return (
                      <div
                        key={venue.slug}
                        className="bg-white rounded-2xl border border-zinc-200/80 p-4 shadow-xs hover:shadow-md transition-all space-y-3 group"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl overflow-hidden bg-zinc-100 border border-zinc-200/80 flex items-center justify-center flex-shrink-0 shadow-2xs">
                              {venue.logoUrl ? (
                                <img
                                  src={venue.logoUrl}
                                  alt={venue.name}
                                  className="w-full h-full object-contain p-1"
                                />
                              ) : (
                                <Store className="w-6 h-6 text-zinc-400" />
                              )}
                            </div>

                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-xs font-extrabold text-black group-hover:text-amber-500 transition-colors leading-tight">
                                  {venue.name}
                                </h4>
                                {venue.isActive === false && (
                                  <span className="text-[9px] font-bold text-zinc-700 bg-zinc-200 px-1.5 py-0.5 rounded">
                                    معطل
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] font-mono text-zinc-400 block mt-0.5 dir-ltr" dir="ltr">
                                ?id={venue.slug}
                              </span>
                            </div>
                          </div>

                          {/* Stats badge */}
                          <div className="flex items-center gap-1.5 text-[11px] text-black bg-amber-400 font-bold px-2.5 py-1 rounded-xl">
                            <Utensils className="w-3.5 h-3.5 text-black" />
                            <span>{venue.products?.length || 0} صنف</span>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 pt-2 border-t border-zinc-100">
                          {/* Visual Editor Trigger: Black & Yellow */}
                          <button
                            onClick={() => onEditVenue(venue)}
                            className="flex-1 py-2 px-3 rounded-xl bg-black hover:bg-zinc-900 text-amber-400 border border-amber-400/20 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                            <span>محرر مرئي مباشر</span>
                          </button>

                          {/* QR Modal */}
                          <button
                            onClick={() => onOpenQR(venue)}
                            className="p-2 rounded-xl border border-zinc-200 hover:bg-black hover:text-amber-400 text-zinc-700 transition-colors cursor-pointer"
                            title="رمز QR"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>

                          {/* Live Menu Preview */}
                          <button
                            onClick={() => onPreviewMenu(venue.slug)}
                            className="p-2 rounded-xl border border-zinc-200 hover:bg-black hover:text-amber-400 text-zinc-700 transition-colors cursor-pointer"
                            title="معاينة قائمة العميل"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
