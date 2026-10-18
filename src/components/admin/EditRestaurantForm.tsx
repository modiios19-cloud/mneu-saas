import React, { useState } from 'react';
import { RestaurantData, Category, MenuItem, ItemBadge } from '../../types/restaurant';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import {
  X,
  Save,
  Plus,
  Trash2,
  Edit2,
  Eye,
  Check,
  Flame,
  Sparkles,
  Tag,
  Store,
  Phone,
  Utensils,
  Layers,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface EditRestaurantFormProps {
  restaurant: RestaurantData;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (updatedRestaurant: RestaurantData) => void;
}

export const EditRestaurantForm: React.FC<EditRestaurantFormProps> = ({
  restaurant,
  isOpen,
  onClose,
  onSaved
}) => {
  if (!isOpen) return null;

  // Active sub-tab
  const [activeTab, setActiveTab] = useState<'info' | 'contact' | 'categories' | 'items'>('info');

  // Form state cloned from restaurant
  const [formData, setFormData] = useState<RestaurantData>({
    ...restaurant,
    isActive: restaurant.isActive !== false,
    categories: [...(restaurant.categories || [])],
    products: [...(restaurant.products || [])],
    contact: { ...(restaurant.contact || {}) }
  });

  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Category creation
  const [newCategoryLabel, setNewCategoryLabel] = useState('');

  // Item creation / editing modal
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);

  // Temporary item form
  const [itemForm, setItemForm] = useState<Partial<MenuItem>>({
    nameAr: '',
    nameEn: '',
    price: 0,
    calories: 0,
    descriptionAr: '',
    imageUrl: '',
    categoryId: formData.categories[0]?.id || 'all',
    badge: undefined,
    isPopular: false,
    isSpicy: false,
    isSoldOut: false
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 1. Save all changes to Firestore
  const handleSaveToFirestore = async () => {
    setSaving(true);
    try {
      if (!db) {
        throw new Error("اتصال Firebase Firestore غير متاح");
      }

      // Convert data to Firestore structure (including items and categories)
      const firestorePayload = {
        name: formData.name,
        nameEn: formData.nameEn || formData.name,
        slug: formData.slug,
        primaryColor: formData.primaryColor,
        secondaryColor: formData.secondaryColor || '#FFEDE5',
        logo: formData.logoUrl,
        logoUrl: formData.logoUrl,
        coverUrl: formData.coverUrl || '',
        currency: formData.currency || 'ر.س',
        statusText: formData.statusText || 'مفتوح للطلبات الآن',
        statusTextEn: formData.statusTextEn || 'Open for orders now',
        isActive: formData.isActive !== false,
        categories: formData.categories,
        products: formData.products,
        items: formData.products.map((p) => ({
          name: p.nameAr,
          nameEn: p.nameEn || p.nameAr,
          price: p.price,
          calories: p.calories,
          description: p.descriptionAr,
          category: p.categoryId,
          image: p.imageUrl,
          badge: p.badge,
          isSoldOut: p.isSoldOut || false,
          isPopular: p.isPopular || false,
          isSpicy: p.isSpicy || false
        })),
        contact: formData.contact,
        updatedAt: new Date().toISOString()
      };

      const docRef = doc(db, 'restaurants', formData.slug);
      await setDoc(docRef, firestorePayload, { merge: true });

      showToast("✅ تم حفظ وتحديث بيانات المطعم في Firestore بنجاح!");
      onSaved(formData);
    } catch (err: any) {
      console.error("Error saving restaurant:", err);
      alert(`حدث خطأ أثناء الحفظ في Firestore: ${err?.message || err}`);
    } finally {
      setSaving(false);
    }
  };

  // Categories Handlers
  const handleAddCategory = () => {
    if (!newCategoryLabel.trim()) return;
    const catId = newCategoryLabel.trim();
    if (formData.categories.some((c) => c.id === catId || c.labelAr === catId)) {
      alert("هذا القسم موجود مسبقاً");
      return;
    }
    const newCat: Category = {
      id: catId,
      labelAr: catId,
      labelEn: catId
    };
    setFormData({
      ...formData,
      categories: [...formData.categories, newCat]
    });
    setNewCategoryLabel('');
    showToast(`تمت إضافة قسم "${catId}"`);
  };

  const handleDeleteCategory = (catId: string) => {
    if (formData.categories.length <= 1) {
      alert("يجب أن يحتوي المنيو على قسم واحد على الأقل");
      return;
    }
    if (confirm(`هل أنت متأكد من حذف قسم "${catId}"؟`)) {
      setFormData({
        ...formData,
        categories: formData.categories.filter((c) => c.id !== catId)
      });
      showToast("تم حذف القسم");
    }
  };

  // Items Handlers
  const handleOpenAddItem = () => {
    setEditingItem(null);
    setItemForm({
      id: `item-${Date.now()}`,
      nameAr: '',
      nameEn: '',
      price: 25,
      calories: 450,
      descriptionAr: '',
      imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&auto=format&fit=crop&q=80',
      categoryId: formData.categories[0]?.id || 'all',
      badge: undefined,
      isPopular: false,
      isSpicy: false,
      isSoldOut: false
    });
    setIsItemModalOpen(true);
  };

  const handleOpenEditItem = (item: MenuItem) => {
    setEditingItem(item);
    setItemForm({ ...item });
    setIsItemModalOpen(true);
  };

  const handleSaveItemModal = () => {
    if (!itemForm.nameAr?.trim()) {
      alert("يرجى إدخال اسم الصنف");
      return;
    }

    const itemToSave: MenuItem = {
      id: itemForm.id || `item-${Date.now()}`,
      categoryId: itemForm.categoryId || formData.categories[0]?.id || 'all',
      nameAr: itemForm.nameAr.trim(),
      nameEn: itemForm.nameEn?.trim() || itemForm.nameAr.trim(),
      descriptionAr: itemForm.descriptionAr?.trim() || '',
      descriptionEn: itemForm.descriptionEn?.trim() || itemForm.descriptionAr?.trim() || '',
      price: Number(itemForm.price) || 0,
      calories: itemForm.calories ? Number(itemForm.calories) : undefined,
      imageUrl: itemForm.imageUrl?.trim() || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400',
      badge: itemForm.badge,
      isPopular: itemForm.badge === 'popular' || Boolean(itemForm.isPopular),
      isSpicy: Boolean(itemForm.isSpicy),
      isSoldOut: Boolean(itemForm.isSoldOut)
    };

    if (editingItem) {
      setFormData({
        ...formData,
        products: formData.products.map((p) => (p.id === editingItem.id ? itemToSave : p))
      });
      showToast("تم تحديث الصنف");
    } else {
      setFormData({
        ...formData,
        products: [...formData.products, itemToSave]
      });
      showToast("تمت إضافة الصنف الجديد");
    }

    setIsItemModalOpen(false);
  };

  const handleDeleteItem = (itemId: string) => {
    if (confirm("هل تريد حذف هذا الصنف من قائمة الطعام؟")) {
      setFormData({
        ...formData,
        products: formData.products.filter((p) => p.id !== itemId)
      });
      showToast("تم حذف الصنف");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />

      {/* Main Modal Box */}
      <div className="relative w-full max-w-4xl bg-white rounded-3xl h-[92vh] flex flex-col shadow-2xl z-10 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Toast inside modal */}
        {toastMessage && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-[#111111] text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-xl flex items-center gap-2 animate-in slide-in-from-top duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Modal Header */}
        <div className="p-4 sm:px-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/70">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold text-sm shadow-sm"
              style={{ backgroundColor: formData.primaryColor }}
            >
              {formData.logoUrl ? (
                <img
                  src={formData.logoUrl}
                  alt={formData.name}
                  className="w-full h-full object-cover rounded-2xl"
                />
              ) : (
                <Store className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-[#111111]">
                  تعديل مطعم: {formData.name}
                </h2>
                <span className="text-[10px] font-mono bg-zinc-200/80 px-2 py-0.5 rounded text-zinc-700">
                  {formData.slug}
                </span>
              </div>
              <p className="text-xs text-[#71717A]">
                إدارة الهوية البصرية، بيانات التواصل، الأقسام، والوجبات
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveToFirestore}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-zinc-200 text-zinc-500 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="px-6 border-b border-zinc-200 bg-white flex gap-6 overflow-x-auto no-scrollbar text-xs">
          {[
            { id: 'info' as const, label: 'البيانات الأساسية والهوية', icon: Store },
            { id: 'contact' as const, label: 'بيانات التواصل', icon: Phone },
            { id: 'categories' as const, label: `الأقسام (${formData.categories.length})`, icon: Layers },
            { id: 'items' as const, label: `الأصناف (${formData.products.length})`, icon: Utensils }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3.5 border-b-2 font-bold whitespace-nowrap flex items-center gap-2 transition-all cursor-pointer ${
                  isActive
                    ? 'border-[#111111] text-[#111111]'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body / Tab Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-6">
          {/* TAB 1: BASIC INFO & THEMING */}
          {activeTab === 'info' && (
            <div className="space-y-6 max-w-2xl">
              {/* Restaurant Active Toggle */}
              <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/80 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[#111111]">
                    حالة المطعم (Active / Inactive)
                  </h4>
                  <p className="text-[11px] text-[#71717A] mt-0.5">
                    تفعيل أو إيقاف استقبال الزوار في القائمة الرقمية
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Name and Slug */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-[#111111] block mb-1">
                    اسم المطعم (عربي / رئيسي) *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full text-xs p-3 rounded-xl border border-zinc-200 focus:outline-none focus:border-[#111111]"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#111111] block mb-1">
                    الاسم بالإنجليزية (Name in English)
                  </label>
                  <input
                    type="text"
                    value={formData.nameEn || ''}
                    onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                    className="w-full text-xs p-3 rounded-xl border border-zinc-200 focus:outline-none focus:border-[#111111]"
                  />
                </div>
              </div>

              {/* Primary Color & Theme */}
              <div className="p-4 rounded-2xl border border-zinc-200/80 bg-zinc-50/50 space-y-3">
                <label className="text-xs font-bold text-[#111111] block">
                  اللون الأساسي للهوية (Primary Color) *
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.primaryColor || '#A33900'}
                    onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                    className="w-10 h-10 rounded-xl cursor-pointer border border-zinc-300 p-0.5 bg-white"
                  />
                  <input
                    type="text"
                    value={formData.primaryColor || '#A33900'}
                    onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                    placeholder="#A33900"
                    className="text-xs font-mono font-bold p-2.5 rounded-xl border border-zinc-200 bg-white w-32 focus:outline-none"
                  />
                  <span
                    className="px-3 py-1.5 rounded-xl text-white text-xs font-bold shadow-xs"
                    style={{ backgroundColor: formData.primaryColor }}
                  >
                    معاينة لون البراند
                  </span>
                </div>
              </div>

              {/* Logo URL */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#111111] block">
                  رابط الشعار (Logo URL)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="url"
                    value={formData.logoUrl}
                    onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                    placeholder="https://..."
                    className="flex-1 text-xs p-3 rounded-xl border border-zinc-200 focus:outline-none focus:border-[#111111]"
                  />
                  {formData.logoUrl && (
                    <img
                      src={formData.logoUrl}
                      alt="Logo preview"
                      className="w-10 h-10 rounded-xl object-contain border border-zinc-200 bg-zinc-100 p-1"
                    />
                  )}
                </div>
              </div>

              {/* Currency & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-[#111111] block mb-1">
                    العملة
                  </label>
                  <input
                    type="text"
                    value={formData.currency || 'ر.س'}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full text-xs p-3 rounded-xl border border-zinc-200 focus:outline-none focus:border-[#111111]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#111111] block mb-1">
                    نص الحالة الظاهر
                  </label>
                  <input
                    type="text"
                    value={formData.statusText || 'مفتوح للطلبات الآن'}
                    onChange={(e) => setFormData({ ...formData, statusText: e.target.value })}
                    className="w-full text-xs p-3 rounded-xl border border-zinc-200 focus:outline-none focus:border-[#111111]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CONTACT DETAILS */}
          {activeTab === 'contact' && (
            <div className="space-y-4 max-w-2xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-[#111111] block mb-1">
                    رقم الهاتف للاتصال
                  </label>
                  <input
                    type="tel"
                    value={formData.contact.phone || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contact: { ...formData.contact, phone: e.target.value }
                      })
                    }
                    placeholder="+966500000000"
                    className="w-full text-xs p-3 rounded-xl border border-zinc-200 focus:outline-none focus:border-[#111111]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#111111] block mb-1">
                    رقم الواتساب
                  </label>
                  <input
                    type="tel"
                    value={formData.contact.whatsapp || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contact: { ...formData.contact, whatsapp: e.target.value }
                      })
                    }
                    placeholder="+966500000000"
                    className="w-full text-xs p-3 rounded-xl border border-zinc-200 focus:outline-none focus:border-[#111111]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#111111] block mb-1">
                  رابط خرائط جوجل (Google Maps URL)
                </label>
                <input
                  type="url"
                  value={formData.contact.maps || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      contact: { ...formData.contact, maps: e.target.value }
                    })
                  }
                  placeholder="https://maps.google.com/..."
                  className="w-full text-xs p-3 rounded-xl border border-zinc-200 focus:outline-none focus:border-[#111111]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-[#111111] block mb-1">
                    حساب إنستغرام
                  </label>
                  <input
                    type="url"
                    value={formData.contact.instagram || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contact: { ...formData.contact, instagram: e.target.value }
                      })
                    }
                    placeholder="https://instagram.com/..."
                    className="w-full text-xs p-3 rounded-xl border border-zinc-200 focus:outline-none focus:border-[#111111]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#111111] block mb-1">
                    حساب تيك توك
                  </label>
                  <input
                    type="url"
                    value={formData.contact.tiktok || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contact: { ...formData.contact, tiktok: e.target.value }
                      })
                    }
                    placeholder="https://tiktok.com/@..."
                    className="w-full text-xs p-3 rounded-xl border border-zinc-200 focus:outline-none focus:border-[#111111]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#111111] block mb-1">
                  العنوان والحي (مثال: الرياض، حي الملقا)
                </label>
                <input
                  type="text"
                  value={formData.contact.locationNameAr || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      contact: { ...formData.contact, locationNameAr: e.target.value }
                    })
                  }
                  className="w-full text-xs p-3 rounded-xl border border-zinc-200 focus:outline-none focus:border-[#111111]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#111111] block mb-1">
                  ساعات العمل اليومية
                </label>
                <input
                  type="text"
                  value={formData.contact.workingHoursAr || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      contact: { ...formData.contact, workingHoursAr: e.target.value }
                    })
                  }
                  placeholder="يومياً من 1:00 ظهراً وحتى 3:00 فجراً"
                  className="w-full text-xs p-3 rounded-xl border border-zinc-200 focus:outline-none focus:border-[#111111]"
                />
              </div>
            </div>
          )}

          {/* TAB 3: CATEGORIES MANAGER */}
          {activeTab === 'categories' && (
            <div className="space-y-6 max-w-2xl">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCategoryLabel}
                  onChange={(e) => setNewCategoryLabel(e.target.value)}
                  placeholder="اسم القسم الجديد (مثلاً: وجبات التوفير، المقبلات...)"
                  className="flex-1 text-xs p-3 rounded-xl border border-zinc-200 focus:outline-none focus:border-[#111111]"
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  className="px-4 py-3 rounded-xl bg-[#111111] hover:bg-black text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة قسم</span>
                </button>
              </div>

              {/* Categories list */}
              <div className="space-y-2">
                {formData.categories.map((cat, index) => (
                  <div
                    key={cat.id || index}
                    className="p-3.5 rounded-2xl border border-zinc-200/80 bg-zinc-50 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-zinc-200 text-zinc-700 text-xs font-mono font-bold flex items-center justify-center">
                        {index + 1}
                      </span>
                      <span className="text-xs font-bold text-[#111111]">
                        {cat.labelAr}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-zinc-400">
                        {formData.products.filter((p) => p.categoryId === cat.id).length} صنف
                      </span>
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="حذف القسم"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: ITEMS MANAGER */}
          {activeTab === 'items' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-[#111111]">
                    قائمة وجبات وأصناف المطعم
                  </h3>
                  <p className="text-[11px] text-[#71717A]">
                    إضافة الأصناف، تعديل الأسعار والشارات (جديد، عرض، الأكثر طلباً، نفدت الكمية)
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleOpenAddItem}
                  className="py-2.5 px-4 rounded-xl bg-[#111111] hover:bg-black text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة وجبة جديدة</span>
                </button>
              </div>

              {/* Items Cards List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {formData.products.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-2xl border transition-all bg-white flex items-start gap-3 relative ${
                      item.isSoldOut
                        ? 'border-zinc-200 bg-zinc-50 opacity-70'
                        : 'border-zinc-200/80 hover:border-zinc-300'
                    }`}
                  >
                    {/* Item Image */}
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-zinc-100 flex-shrink-0 relative">
                      <img
                        src={item.imageUrl}
                        alt={item.nameAr}
                        className="w-full h-full object-cover"
                      />
                      {item.isSoldOut && (
                        <div className="absolute inset-0 bg-black/50 text-white text-[8px] font-bold flex items-center justify-center text-center p-1">
                          نفدت الكمية
                        </div>
                      )}
                    </div>

                    {/* Item Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <h4 className="text-xs font-bold text-[#111111] truncate">
                          {item.nameAr}
                        </h4>
                        <span className="text-xs font-extrabold text-[#A33900] font-en whitespace-nowrap">
                          {item.price} {formData.currency || 'ر.س'}
                        </span>
                      </div>

                      <p className="text-[11px] text-[#71717A] line-clamp-1 mt-0.5">
                        {item.descriptionAr}
                      </p>

                      {/* Badges pills */}
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <span className="text-[10px] bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-md font-medium">
                          {item.categoryId}
                        </span>

                        {item.badge === 'offer' && (
                          <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-md font-bold">
                            🔥 عرض خاص
                          </span>
                        )}
                        {item.badge === 'new' && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-md font-bold">
                            ✨ جديد
                          </span>
                        )}
                        {item.isPopular && (
                          <span className="text-[10px] bg-orange-100 text-[#A33900] px-1.5 py-0.5 rounded-md font-bold">
                            ⭐ الأكثر طلباً
                          </span>
                        )}
                        {item.isSpicy && (
                          <span className="text-[10px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded-md font-bold">
                            🌶️ حار
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditItem(item)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-[#111111] hover:bg-zinc-100 transition-colors"
                        title="تعديل الصنف"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="حذف الصنف"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Bar */}
        <div className="p-4 px-6 border-t border-zinc-100 bg-zinc-50 flex items-center justify-between">
          <span className="text-xs text-[#71717A]">
            * التعديلات تُحفظ مباشرة في قاعدة بيانات Firestore السحابية
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-100 transition-all cursor-pointer"
            >
              إغلاق
            </button>
            <button
              onClick={handleSaveToFirestore}
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'جاري الحفظ...' : 'حفظ التعديلات في Firestore'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* SUB-MODAL: Add / Edit Single Item */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="text-sm font-extrabold text-[#111111]">
                {editingItem ? 'تعديل الصنف' : 'إضافة صنف جديد'}
              </h3>
              <button
                onClick={() => setIsItemModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs max-h-[70vh] overflow-y-auto no-scrollbar p-1">
              <div>
                <label className="font-bold text-[#111111] block mb-1">
                  اسم الصنف بالعربي *
                </label>
                <input
                  type="text"
                  value={itemForm.nameAr || ''}
                  onChange={(e) => setItemForm({ ...itemForm, nameAr: e.target.value })}
                  placeholder="مثال: ترافل تشيزي فرايز"
                  className="w-full p-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:border-[#111111]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#111111] block mb-1">
                    القسم التابع له *
                  </label>
                  <select
                    value={itemForm.categoryId || formData.categories[0]?.id}
                    onChange={(e) => setItemForm({ ...itemForm, categoryId: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:border-[#111111] bg-white"
                  >
                    {formData.categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.labelAr}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-[#111111] block mb-1">
                    السعر ({formData.currency || 'ر.س'}) *
                  </label>
                  <input
                    type="number"
                    value={itemForm.price || ''}
                    onChange={(e) => setItemForm({ ...itemForm, price: Number(e.target.value) })}
                    placeholder="32"
                    className="w-full p-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:border-[#111111]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-[#111111] block mb-1">
                  الوصف والمكونات
                </label>
                <textarea
                  value={itemForm.descriptionAr || ''}
                  onChange={(e) => setItemForm({ ...itemForm, descriptionAr: e.target.value })}
                  placeholder="مكونات الصنف، نوع الصوص، الإضافات..."
                  rows={2}
                  className="w-full p-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:border-[#111111] resize-none"
                />
              </div>

              <div>
                <label className="font-bold text-[#111111] block mb-1">
                  رابط صورة الصنف (Image URL)
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="url"
                    value={itemForm.imageUrl || ''}
                    onChange={(e) => setItemForm({ ...itemForm, imageUrl: e.target.value })}
                    placeholder="https://..."
                    className="flex-1 p-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:border-[#111111]"
                  />
                  {itemForm.imageUrl && (
                    <img
                      src={itemForm.imageUrl}
                      alt="preview"
                      className="w-9 h-9 rounded-lg object-cover border border-zinc-200"
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#111111] block mb-1">
                    السعرات الحرارية
                  </label>
                  <input
                    type="number"
                    value={itemForm.calories || ''}
                    onChange={(e) => setItemForm({ ...itemForm, calories: Number(e.target.value) })}
                    placeholder="540"
                    className="w-full p-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:border-[#111111]"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#111111] block mb-1">
                    الشارة الترويجية (Badge)
                  </label>
                  <select
                    value={itemForm.badge || ''}
                    onChange={(e) => setItemForm({ ...itemForm, badge: e.target.value || undefined })}
                    className="w-full p-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:border-[#111111] bg-white"
                  >
                    <option value="">بدون شارة</option>
                    <option value="new">✨ جديد</option>
                    <option value="offer">🔥 عرض خاص</option>
                    <option value="popular">⭐ الأكثر طلباً</option>
                  </select>
                </div>
              </div>

              {/* Toggles: Spicy, Sold Out */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <label className="flex items-center gap-2 p-2.5 rounded-xl border border-zinc-200 cursor-pointer hover:bg-zinc-50">
                  <input
                    type="checkbox"
                    checked={itemForm.isSpicy || false}
                    onChange={(e) => setItemForm({ ...itemForm, isSpicy: e.target.checked })}
                    className="rounded text-[#A33900]"
                  />
                  <span className="font-bold">🌶️ وجبة حارة</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-xl border border-zinc-200 cursor-pointer hover:bg-zinc-50">
                  <input
                    type="checkbox"
                    checked={itemForm.isSoldOut || false}
                    onChange={(e) => setItemForm({ ...itemForm, isSoldOut: e.target.checked })}
                    className="rounded text-red-600"
                  />
                  <span className="font-bold text-red-600">🚫 نفدت الكمية</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setIsItemModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-600 hover:bg-zinc-50"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveItemModal}
                className="px-5 py-2 rounded-xl bg-[#111111] hover:bg-black text-white text-xs font-bold shadow-md cursor-pointer"
              >
                حفظ الصنف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
