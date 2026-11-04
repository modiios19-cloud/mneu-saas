import React, { useEffect, useMemo, useRef, useState } from 'react';
import { collection, doc, getDoc, getDocs, serverTimestamp, setDoc, Timestamp, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { buildStitchDocument } from '../../lib/stitchDesign';
import { makePreviewUrl, toEditableMenu, toPreviewMenu, whatsappLink, whatsappPreviewMessage } from '../../lib/menuDrafts';
import { RestaurantData, Category, MenuItem, ItemBadge } from '../../types/restaurant';
import {
  Save,
  ArrowRight,
  Plus,
  Trash2,
  Image as ImageIcon,
  Smartphone,
  Monitor,
  Sparkles,
  Flame,
  CheckCircle2,
  RefreshCw,
  Eye,
  Camera,
  X,
  Tag,
  Phone,
  MessageCircle,
  MapPin,
  Clock,
  Layers,
  Palette
} from 'lucide-react';

interface VisualMenuEditorProps {
  initialRestaurant: RestaurantData;
  publicBaseUrl: string;
  onClose: () => void;
  onSaved: (updatedRestaurant: RestaurantData) => void;
  availableTypes?: { id: string; labelAr: string }[];
}

export const VisualMenuEditor: React.FC<VisualMenuEditorProps> = ({
  initialRestaurant,
  publicBaseUrl,
  onClose,
  onSaved,
  availableTypes = [
    { id: 'restaurant', labelAr: 'مطعم' },
    { id: 'cafe', labelAr: 'مقهى' }
  ]
}) => {
  // Local editable draft state
  const [draft, setDraft] = useState<RestaurantData>({
    ...initialRestaurant,
    type: initialRestaurant.type || 'restaurant',
    categories: initialRestaurant.categories?.length
      ? [...initialRestaurant.categories]
      : [
          { id: 'all', labelAr: 'الأكثر طلباً', labelEn: 'Signature', sublabelEn: 'SIGNATURE & BEST' },
          { id: 'cat-1', labelAr: 'الوجبات الرئيسية', labelEn: 'Main Meals' }
        ],
    products: initialRestaurant.products?.length ? [...initialRestaurant.products] : [],
    contact: { ...(initialRestaurant.contact || {}) }
  });

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [isMobileFrame, setIsMobileFrame] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [draftReady, setDraftReady] = useState(false);
  const [draftSaveStatus, setDraftSaveStatus] = useState<'loading' | 'saving' | 'saved' | 'error'>('loading');
  const [shareBusy, setShareBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewPhone, setPreviewPhone] = useState(initialRestaurant.client?.phone || '');
  const [previewMessage, setPreviewMessage] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [menuVersions, setMenuVersions] = useState<{ id: string; savedAt: string; menu: Partial<RestaurantData> }[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const stitchPreviewRef = useRef<HTMLIFrameElement>(null);

  // Modal for changing an image URL
  const [editingImageTarget, setEditingImageTarget] = useState<{
    type: 'logo' | 'item';
    itemId?: string;
    bindingKey?: string;
    currentUrl: string;
  } | null>(null);
  const [imageUrlInput, setImageUrlInput] = useState('');

  const primaryColor = draft.primaryColor || '#A33900';
  const stitchMenuData = useMemo(() => ({
    restaurant: {
      id: draft.id,
      slug: draft.slug,
      name: draft.name,
      nameEn: draft.nameEn,
      logoUrl: draft.logoUrl,
      primaryColor,
      secondaryColor: draft.secondaryColor,
      currency: draft.currency || 'ر.س',
      type: draft.type,
      contact: draft.contact,
      statusText: draft.statusText
    },
    categories: draft.categories,
    products: draft.products,
    offers: draft.products.filter((item) => item.badge === 'offer'),
    updatedAt: draft.updatedAt || null
  }), [draft, primaryColor]);
  const stitchPreviewDocument = useMemo(
    () => draft.stitchDesignCode ? buildStitchDocument(draft.stitchDesignCode, {
      restaurant: {}, categories: [], products: [], offers: [], updatedAt: null
    }) : '',
    [draft.stitchDesignCode]
  );

  useEffect(() => {
    stitchPreviewRef.current?.contentWindow?.postMessage({ type: 'MENU_DATA_UPDATE', payload: stitchMenuData }, '*');
  }, [stitchMenuData]);

  const applyInlineEdit = (key: string, value: string) => {
    const [kind, id, field] = key.split(':');
    if (kind === 'restaurant' && id) {
      const restaurantFields = ['name', 'nameEn', 'logoUrl', 'primaryColor', 'secondaryColor', 'statusText'];
      if (restaurantFields.includes(id)) {
        setDraft((prev) => ({ ...prev, [id]: value } as RestaurantData));
      }
      return;
    }
    if (kind === 'contact' && id) {
      const contactFields = ['phone', 'whatsapp', 'maps', 'instagram', 'tiktok', 'locationNameAr', 'workingHoursAr'];
      if (contactFields.includes(id)) {
        updateContact(id as keyof typeof draft.contact, value);
      }
      return;
    }
    if (kind === 'category' && id && field) {
      const allowed = ['labelAr', 'labelEn', 'sublabelEn'];
      if (!allowed.includes(field)) return;
      setDraft((prev) => ({
        ...prev,
        categories: prev.categories.map((category) => category.id === id ? { ...category, [field]: value } : category)
      }));
      return;
    }
    if (kind === 'product' && id && field) {
      const allowed = ['nameAr', 'nameEn', 'descriptionAr', 'descriptionEn', 'price', 'originalPrice', 'calories', 'imageUrl'];
      if (!allowed.includes(field)) return;
      const nextValue = ['price', 'originalPrice', 'calories'].includes(field) ? Number(value.replace(/[^0-9.]/g, '')) || 0 : value;
      setDraft((prev) => ({
        ...prev,
        products: prev.products.map((product) => product.id === id ? { ...product, [field]: nextValue } : product)
      }));
    }
  };

  useEffect(() => {
    const handleInlineMessage = (event: MessageEvent) => {
      if (event.source !== stitchPreviewRef.current?.contentWindow) return;
      const message = event.data;
      if (message?.type === 'MENU_INLINE_TEXT_EDIT' && typeof message.key === 'string' && typeof message.value === 'string') {
        applyInlineEdit(message.key, message.value);
        showToast('تم تحديث المحتوى داخل التصميم');
      }
      if (message?.type === 'MENU_INLINE_IMAGE_EDIT' && typeof message.key === 'string') {
        setEditingImageTarget({ type: 'item', bindingKey: message.key, currentUrl: String(message.value || '') });
        setImageUrlInput(String(message.value || ''));
      }
    };
    window.addEventListener('message', handleInlineMessage);
    return () => window.removeEventListener('message', handleInlineMessage);
  }, [draft.contact]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 1. Direct Updates to draft
  const updateField = <K extends keyof RestaurantData>(key: K, value: RestaurantData[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const updateContact = (key: keyof typeof draft.contact, value: string) => {
    setDraft((prev) => ({
      ...prev,
      contact: { ...prev.contact, [key]: value }
    }));
  };

  // 2. Categories Updates
  const handleAddCategory = () => {
    const newName = prompt('أدخل اسم القسم الجديد (مثلاً: سلال البطاطس، المشروبات، الحلى):');
    if (!newName || !newName.trim()) return;
    const catId = `cat-${Date.now()}`;
    const newCat: Category = {
      id: catId,
      labelAr: newName.trim(),
      labelEn: newName.trim(),
      sublabelEn: newName.trim().toUpperCase()
    };
    setDraft((prev) => ({
      ...prev,
      categories: [...prev.categories, newCat]
    }));
    setActiveCategory(catId);
    showToast(`تمت إضافة قسم "${newName.trim()}"`);
  };

  const handleRenameCategory = (catId: string, currentLabel: string) => {
    const newLabel = prompt('تعديل اسم القسم:', currentLabel);
    if (!newLabel || !newLabel.trim()) return;
    setDraft((prev) => ({
      ...prev,
      categories: prev.categories.map((c) =>
        c.id === catId ? { ...c, labelAr: newLabel.trim(), labelEn: newLabel.trim() } : c
      )
    }));
  };

  const handleDeleteCategory = (catId: string) => {
    if (draft.categories.length <= 1) {
      alert('يجب أن يحتوي المنيو على قسم واحد على الأقل');
      return;
    }
    if (confirm('هل أنت متأكد من حذف هذا القسم؟ (لن تُحذف الوجبات بل ستُنقل لقسم آخر)')) {
      const remainingCats = draft.categories.filter((c) => c.id !== catId);
      const fallbackCat = remainingCats[0]?.id || 'all';
      setDraft((prev) => ({
        ...prev,
        categories: remainingCats,
        products: prev.products.map((p) => (p.categoryId === catId ? { ...p, categoryId: fallbackCat } : p))
      }));
      setActiveCategory('all');
      showToast('تم حذف القسم');
    }
  };

  // 3. Products / Items Updates
  const handleAddNewItemToCategory = (targetCategoryId: string) => {
    const effectiveCategory = targetCategoryId === 'all'
      ? draft.categories.find((c) => c.id !== 'all')?.id || 'cat-1'
      : targetCategoryId;

    const newItem: MenuItem = {
      id: `item-${Date.now()}`,
      categoryId: effectiveCategory,
      nameAr: 'اسم الوجبة الجديدة (اضغط للتعديل)',
      nameEn: 'New Dish Name',
      price: 25,
      calories: 450,
      descriptionAr: 'انقر هنا لكتابة وصف ومكونات هذه الوجبة الشهية...',
      imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&auto=format&fit=crop&q=80',
      isPopular: false,
      isSpicy: false,
      isSoldOut: false
    };

    setDraft((prev) => ({
      ...prev,
      products: [...prev.products, newItem]
    }));
    showToast('تمت إضافة وجبة جديدة، انقر على أي جزء فيها لتعديله مباشرة!');
  };

  const handleUpdateItem = (itemId: string, updates: Partial<MenuItem>) => {
    setDraft((prev) => ({
      ...prev,
      products: prev.products.map((p) => (p.id === itemId ? { ...p, ...updates } : p))
    }));
  };

  const handleDeleteItem = (itemId: string) => {
    if (confirm('هل تريد حذف هذا الصنف من القائمة؟')) {
      setDraft((prev) => ({
        ...prev,
        products: prev.products.filter((p) => p.id !== itemId)
      }));
      showToast('تم حذف الصنف');
    }
  };

  const cycleBadge = (item: MenuItem) => {
    const badges: (ItemBadge | undefined)[] = [undefined, 'popular', 'new', 'offer', 'soldout'];
    const currentIndex = badges.indexOf(item.badge as ItemBadge);
    const nextBadge = badges[(currentIndex + 1) % badges.length];
    handleUpdateItem(item.id, {
      badge: nextBadge,
      isPopular: nextBadge === 'popular',
      isSoldOut: nextBadge === 'soldout'
    });
  };

  // 4. Image URL handler
  const openImageEditor = (type: 'logo' | 'item', currentUrl: string, itemId?: string) => {
    setEditingImageTarget({ type, currentUrl, itemId });
    setImageUrlInput(currentUrl);
  };

  const saveImageUrl = () => {
    if (!editingImageTarget) return;
    if (editingImageTarget.bindingKey) {
      applyInlineEdit(editingImageTarget.bindingKey, imageUrlInput.trim());
    } else if (editingImageTarget.type === 'logo') {
      updateField('logoUrl', imageUrlInput.trim());
    } else if (editingImageTarget.type === 'item' && editingImageTarget.itemId) {
      handleUpdateItem(editingImageTarget.itemId, { imageUrl: imageUrlInput.trim() });
    }
    setEditingImageTarget(null);
    showToast('تم تحديث الصورة بنجاح');
  };

  // 5. Save to Firestore
  const handleSaveToFirestore = async () => {
    if (!draft.name?.trim()) {
      alert('يرجى إدخال اسم المطعم أو المقهى');
      return;
    }
    if (!draft.slug?.trim()) {
      alert('يرجى إدخال معرّف الرابط (Slug)');
      return;
    }
    // Document IDs are used as public URLs; renaming requires a separate, safe migration.
    if (draft.slug.trim().toLowerCase() !== initialRestaurant.id) {
      alert('تغيير معرّف الرابط غير مدعوم من المحرر حاليًا حتى لا تنشأ نسخة جديدة أو تضيع البيانات. يمكنك تعديل اسم المطعم بحرية.');
      return;
    }
    if (new Blob([draft.stitchDesignCode || '']).size > 400_000) {
      alert('حجم تصميم Stitch يتجاوز 400 كيلوبايت. استخدم روابط مستضافة للصور والخطوط بدل تضمينها داخل الكود.');
      return;
    }
    if (draft.stitchDesignCode?.trim() && !/<!doctype\s+html|<html[\s>]/i.test(draft.stitchDesignCode)) {
      alert('ألصق مستند HTML كاملًا من Stitch، وليس JSX أو إعدادات JSON.');
      return;
    }

    setSaving(true);
    try {
      if (!db) throw new Error('Firestore connection unavailable');

      const cleanSlug = draft.slug.trim().toLowerCase();

      // Transform products and categories into Firestore ready format
      const payload = {
        name: draft.name.trim(),
        nameEn: draft.nameEn || draft.name,
        slug: cleanSlug,
        primaryColor: draft.primaryColor || '#A33900',
        secondaryColor: draft.secondaryColor || '#FFEDE5',
        type: draft.type || 'restaurant',
        logo: draft.logoUrl || '',
        logoUrl: draft.logoUrl || '',
        coverUrl: draft.coverUrl || '',
        currency: draft.currency || 'ر.س',
        statusText: draft.statusText || 'مفتوح للطلبات الآن',
        statusTextEn: draft.statusTextEn || 'Open for orders now',
        isActive: draft.isActive !== false,
        categories: draft.categories,
        products: draft.products,
        items: draft.products.map((p) => ({
          name: p.nameAr,
          price: p.price,
          originalPrice: p.originalPrice || null,
          calories: p.calories,
          description: p.descriptionAr,
          category: p.categoryId,
          image: p.imageUrl,
          badge: p.badge,
          isSoldOut: p.isSoldOut || false,
          isPopular: p.isPopular || false,
          isSpicy: p.isSpicy || false
        })),
        contact: draft.contact,
        stitchDesignCode: draft.stitchDesignCode || '',
        updatedAt: new Date().toISOString()
      };

      const docRef = doc(db, 'restaurants', initialRestaurant.id);
      await setDoc(docRef, payload, { merge: true });

      showToast('🎉 تم حفظ ونشر جميع التعديلات المرئية إلى Firebase بنجاح!');
      onSaved({ ...draft, id: initialRestaurant.id, slug: cleanSlug });
    } catch (err: any) {
      console.error('Error publishing to Firestore:', err);
      alert(`حدث خطأ أثناء النشر إلى Firebase: ${err?.message || err}`);
    } finally {
      setSaving(false);
    }
  };

  // Filter products by selected active category
  const categoriesWithProducts = draft.categories.map((cat: Category) => {
    if (cat.id === 'all') {
      return {
        ...cat,
        items: draft.products
      };
    }
    return {
      ...cat,
      items: draft.products.filter((p: MenuItem) => p.categoryId === cat.id)
    };
  });

  const visibleSections = activeCategory === 'all'
    ? categoriesWithProducts.filter((c) => c.id !== 'all')
    : categoriesWithProducts.filter((c) => c.id === activeCategory);

  return (
    <div
      className="fixed inset-0 z-50 bg-[#F4F4F6] flex flex-col font-sans text-[#111111] overflow-hidden"
      style={{
        '--color-brand': primaryColor,
        '--primary-color': primaryColor
      } as React.CSSProperties}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-60 bg-black text-amber-400 border border-amber-400/30 text-xs font-bold px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP EDITING TOOLBAR */}
      <header className="h-16 bg-[#111111] text-white px-4 sm:px-6 flex items-center justify-between gap-4 z-40 shadow-md">
        {/* Right Info & Back */}
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
            title="إلغاء والعودة للداشبورد"
          >
            <ArrowRight className="w-4 h-4" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold flex items-center gap-1.5 text-amber-400">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                المحرر المرئي المباشر (Visual Live Editor)
              </span>
              <span className="text-[10px] bg-amber-400 text-black font-bold px-2 py-0.5 rounded-full font-mono">
                WYSIWYG
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 hidden sm:block">
              انقر على أي نص، سعر، صورة، أو صنف لتعديله مباشرة في مكانه
            </p>
          </div>
        </div>

        {/* Center Live Controls: Primary Color, Type, Slug */}
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
          {/* Primary Color Picker */}
          <div className="flex items-center gap-1.5 bg-zinc-800 px-2.5 py-1.5 rounded-xl border border-zinc-700">
            <Palette className="w-3.5 h-3.5 text-zinc-400" />
            <input
              type="color"
              value={draft.primaryColor || '#A33900'}
              onChange={(e) => updateField('primaryColor', e.target.value)}
              className="w-5 h-5 rounded-md cursor-pointer border-0 p-0 bg-transparent"
              title="تغيير لون الهوية البصرية"
            />
            <span className="text-[10px] font-mono text-zinc-300 uppercase">
              {draft.primaryColor}
            </span>
          </div>

          {/* Type Selector (مطعم / مقهى) */}
          <div className="flex items-center bg-zinc-800 px-2 py-1.5 rounded-xl border border-zinc-700 text-xs">
            <span className="text-[10px] text-zinc-400 ml-1.5">النوع:</span>
            <select
              value={draft.type || 'restaurant'}
              onChange={(e) => updateField('type', e.target.value)}
              className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer"
            >
              {availableTypes.map((t) => (
                <option key={t.id} value={t.id} className="bg-zinc-900 text-white">
                  {t.labelAr}
                </option>
              ))}
            </select>
          </div>

          {/* Slug input */}
          <div className="flex items-center bg-zinc-800 px-2.5 py-1.5 rounded-xl border border-zinc-700 text-xs hidden md:flex">
            <span className="text-[10px] text-zinc-400 ml-1 font-mono">?id=</span>
            <input
              type="text"
              value={draft.slug}
              onChange={(e) => updateField('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              className="w-24 bg-transparent font-mono font-bold text-white focus:outline-none"
              placeholder="slug"
            />
          </div>

          {/* Device Frame View Mode Toggle */}
          <div className="hidden sm:flex bg-zinc-800 p-1 rounded-xl border border-zinc-700">
            <button
              onClick={() => setIsMobileFrame(true)}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isMobileFrame ? 'bg-amber-400 text-black font-bold' : 'text-zinc-400 hover:text-white'
              }`}
              title="محاكاة شاشة الجوال"
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsMobileFrame(false)}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                !isMobileFrame ? 'bg-amber-400 text-black font-bold' : 'text-zinc-400 hover:text-white'
              }`}
              title="عرض كامل الشاشة"
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Save & Publish Action */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveToFirestore}
            disabled={saving}
            className="py-2.5 px-5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-black" />
                <span>جاري النشر...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-black" />
                <span>حفظ ونشر إلى Firebase</span>
              </>
            )}
          </button>
        </div>
      </header>


      {/* WORKSPACE CANVAS */}
      <details className="z-30 bg-zinc-950 text-white border-b border-zinc-800 px-4 py-3">
          <summary className="cursor-pointer text-xs font-bold text-amber-300">إضافة / استبدال تصميم Stitch</summary>
          <div className="max-w-5xl mx-auto pt-3 space-y-2">
            <p className="text-[11px] text-zinc-400">الصق نسخة HTML جديدة من Stitch. تظهر معاينتها بجانب المحرر وتتحدث عند تعديل البيانات. يجب أن يقرأ التصميم <code dir="ltr">window.MENU_DATA</code> ويعيد العرض عند حدث <code dir="ltr">menu-data-update</code>.</p>
            <textarea
              value={draft.stitchDesignCode || ''}
              onChange={(e) => updateField('stitchDesignCode', e.target.value)}
              rows={8}
              dir="ltr"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-3 font-mono text-xs text-amber-100 focus:outline-none focus:border-amber-400"
              aria-label="كود تصميم Stitch"
            />
            <div className="text-left text-[10px] text-zinc-500">{new Blob([draft.stitchDesignCode || '']).size.toLocaleString()} / 400,000 بايت</div>
          </div>
      </details>
      <div className={`flex-1 min-h-0 overflow-y-auto no-scrollbar p-2 sm:p-4 xl:p-6 bg-zinc-200/60 flex justify-center items-start`}>
        <div
          className={`${draft.stitchDesignCode ? 'hidden' : 'block'} w-full bg-white transition-all duration-300 shadow-2xl relative justify-self-center ${
            isMobileFrame
              ? 'max-w-md rounded-[40px] my-2 border-[8px] border-zinc-900 overflow-hidden min-h-[820px]'
              : 'max-w-2xl rounded-3xl min-h-[800px]'
          }`}
        >
          {/* Subtle Mobile Speaker Bar */}
          {isMobileFrame && (
            <div className="h-4 bg-zinc-900 flex justify-center items-center">
              <div className="w-16 h-1 bg-zinc-700 rounded-full" />
            </div>
          )}

          {/* LIVE EDITABLE CUSTOMER MENU */}
          <div className="p-0 flex flex-col min-h-[750px]">
            {/* 1. Header with In-Place Editable Brand & Logo */}
            <div className="p-4 pt-6 border-b border-[#F1F1F4] flex flex-col items-center justify-center text-center gap-2 bg-gradient-to-b from-zinc-50/60 to-white relative group">
              {/* Logo with Camera Edit overlay */}
              <div
                onClick={() => openImageEditor('logo', draft.logoUrl || '')}
                className="relative cursor-pointer group/logo"
                title="انقر لتغيير رابط شعار المطعم"
              >
                {draft.logoUrl ? (
                  <img
                    alt={draft.name}
                    src={draft.logoUrl}
                    className="h-14 w-auto max-w-[120px] object-contain transition-transform group-hover/logo:scale-105"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-400">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 rounded-xl opacity-0 group-hover/logo:opacity-100 flex items-center justify-center text-white transition-opacity">
                  <Camera className="w-4 h-4" />
                </div>
              </div>

              {/* Editable Restaurant Name */}
              <input
                type="text"
                value={draft.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="اكتب اسم المطعم هنا..."
                className="font-en text-xl font-black tracking-widest text-[#111111] uppercase text-center bg-transparent border-b border-dashed border-zinc-300 hover:border-[#A33900] focus:border-[#A33900] focus:outline-none px-2 py-0.5 max-w-xs transition-colors"
                title="انقر لتعديل اسم المطعم مباشرة"
              />

              {/* Editable Status Text */}
              <input
                type="text"
                value={draft.statusText || 'مفتوح للطلبات الآن'}
                onChange={(e) => updateField('statusText', e.target.value)}
                className="text-[11px] text-[#71717A] text-center bg-transparent border-b border-transparent hover:border-zinc-300 focus:outline-none px-2 py-0.5"
                placeholder="حالة الفرع (مثلاً: مفتوح للطلبات الآن)"
              />
            </div>

            {/* 2. Interactive Category Tabs with (+) Button */}
            <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-[#F1F1F4] px-4 flex items-center gap-4 overflow-x-auto no-scrollbar">
              {draft.categories.map((cat) => {
                const isActive = activeCategory === cat.id;
                return (
                  <div key={cat.id} className="relative group/tab flex items-center">
                    <button
                      onClick={() => setActiveCategory(cat.id)}
                      onDoubleClick={() => handleRenameCategory(cat.id, cat.labelAr)}
                      className={`category-tab py-3.5 whitespace-nowrap text-xs transition-colors cursor-pointer ${
                        isActive
                          ? 'font-bold text-[#111111]'
                          : 'font-medium text-[#71717A] hover:text-[#111111]'
                      }`}
                      title="انقر نقراً مزدوجاً لإعادة تسمية القسم"
                    >
                      {cat.labelAr}
                      {isActive && (
                        <span
                          className="indicator absolute bottom-0 inset-x-0 h-[2px] rounded-full transition-all duration-300"
                          style={{ backgroundColor: primaryColor }}
                        />
                      )}
                    </button>

                    {/* Quick delete button on hover */}
                    {cat.id !== 'all' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCategory(cat.id);
                        }}
                        className="opacity-0 group-hover/tab:opacity-100 text-zinc-400 hover:text-black p-0.5 ml-1 transition-opacity cursor-pointer"
                        title="حذف هذا القسم"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}

              {/* Add New Category Button */}
              <button
                type="button"
                onClick={handleAddCategory}
                className="p-1.5 rounded-full bg-zinc-100 hover:bg-[#A33900] hover:text-white text-zinc-600 transition-colors flex-shrink-0 cursor-pointer"
                title="إضافة قسم جديد للمنيو"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 3. Sections and Meals List */}
            <div className="p-4 sm:p-6 space-y-8 flex-1">
              {visibleSections.map((section) => (
                <section key={section.id} className="space-y-4">
                  {/* Section Title with Rename / Delete */}
                  <div className="flex items-center justify-between border-b border-[#F1F1F4] pb-2 group/sec">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={section.labelAr}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDraft((prev) => ({
                            ...prev,
                            categories: prev.categories.map((c) =>
                              c.id === section.id ? { ...c, labelAr: val } : c
                            )
                          }));
                        }}
                        className="text-base font-extrabold text-[#111111] bg-transparent border-b border-transparent hover:border-zinc-300 focus:border-[#A33900] focus:outline-none px-1"
                        title="انقر لتعديل عنوان القسم"
                      />
                      <span className="text-[10px] text-[#71717A] bg-zinc-100 px-2 py-0.5 rounded-full font-mono">
                        {section.items.length} صنف
                      </span>
                    </div>

                    <button
                      onClick={() => handleAddNewItemToCategory(section.id)}
                      className="text-xs font-bold text-[#A33900] hover:bg-[#A33900]/10 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>إضافة وجبة</span>
                    </button>
                  </div>

                  {/* Meals Items */}
                  <div className="space-y-3">
                    {section.items.map((item) => (
                      <div
                        key={item.id}
                        className={`p-3 rounded-2xl border transition-all flex items-start gap-3 relative group/item bg-white ${
                          item.isSoldOut ? 'opacity-60 bg-zinc-50 border-zinc-200' : 'border-zinc-100 hover:border-zinc-300 shadow-2xs'
                        }`}
                      >
                        {/* Meal Image with Hover Edit */}
                        <div
                          onClick={() => openImageEditor('item', item.imageUrl, item.id)}
                          className="w-20 h-20 rounded-xl overflow-hidden bg-zinc-100 flex-shrink-0 relative cursor-pointer group/img"
                          title="انقر لتغيير صورة الوجبة"
                        >
                          <img
                            src={item.imageUrl}
                            alt={item.nameAr}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center text-white transition-opacity">
                            <Camera className="w-4 h-4" />
                          </div>

                          {/* Quick Badge indicator (Yellow & Black) */}
                          {item.badge === 'offer' && (
                            <span className="absolute top-1 right-1 bg-amber-400 text-black text-[8px] font-black px-1.5 py-0.5 rounded shadow-xs">
                              🔥 عرض
                            </span>
                          )}
                          {item.badge === 'new' && (
                            <span className="absolute top-1 right-1 bg-black text-amber-400 border border-amber-400/30 text-[8px] font-black px-1.5 py-0.5 rounded shadow-xs">
                              ✨ جديد
                            </span>
                          )}
                          {item.isPopular && (
                            <span className="absolute top-1 right-1 bg-amber-400 text-black text-[8px] font-black px-1.5 py-0.5 rounded shadow-xs">
                              ⭐ مميز
                            </span>
                          )}
                          {item.isSoldOut && (
                            <span className="absolute inset-0 bg-black/75 text-amber-400 text-[9px] font-black flex items-center justify-center text-center p-1">
                              نفدت الكمية
                            </span>
                          )}
                        </div>

                        {/* Inline Editable Meal Details */}
                        <div className="flex-1 min-w-0 space-y-1">
                          {/* Row 1: Name and Price */}
                          <div className="flex items-start justify-between gap-2">
                            <input
                              type="text"
                              value={item.nameAr}
                              onChange={(e) => handleUpdateItem(item.id, { nameAr: e.target.value })}
                              placeholder="اسم الوجبة..."
                              className="text-xs font-bold text-[#111111] bg-transparent border-b border-transparent hover:border-zinc-300 focus:border-[#A33900] focus:outline-none flex-1 py-0.5"
                              title="انقر لتعديل اسم الوجبة"
                            />

                            <div className="flex items-center gap-1 font-en whitespace-nowrap">
                              <input
                                type="number"
                                value={item.price}
                                onChange={(e) => handleUpdateItem(item.id, { price: Number(e.target.value) })}
                                className="w-12 text-xs font-black text-right bg-transparent border-b border-transparent hover:border-zinc-300 focus:border-[#A33900] focus:outline-none py-0.5"
                                style={{ color: primaryColor }}
                                title="انقر لتعديل السعر"
                              />
                              <span className="text-xs font-bold" style={{ color: primaryColor }}>
                                {draft.currency || 'ر.س'}
                              </span>
                            </div>
                          </div>
                          <div className="flex justify-end items-center gap-1 text-[9px] text-zinc-400">
                            <span>السعر قبل الخصم</span>
                            <input
                              type="number"
                              min="0"
                              value={item.originalPrice ?? ''}
                              onChange={(e) => handleUpdateItem(item.id, { originalPrice: e.target.value ? Number(e.target.value) : undefined, badge: e.target.value ? 'offer' : item.badge })}
                              placeholder="اختياري"
                              className="w-14 border-b border-dashed border-zinc-300 bg-transparent text-right font-en focus:outline-none focus:border-[#A33900]"
                              aria-label={`السعر قبل الخصم لصنف ${item.nameAr}`}
                            />
                          </div>

                          {/* Row 2: Description */}
                          <textarea
                            value={item.descriptionAr}
                            onChange={(e) => handleUpdateItem(item.id, { descriptionAr: e.target.value })}
                            placeholder="وصف ومكونات الصنف..."
                            rows={2}
                            className="w-full text-[11px] text-[#71717A] leading-relaxed bg-transparent border-b border-transparent hover:border-zinc-300 focus:border-[#A33900] focus:outline-none resize-none py-0.5"
                            title="انقر لتعديل الوصف"
                          />

                          {/* Row 3: Badges & Calories controls */}
                          <div className="flex items-center justify-between pt-1 text-[10px]">
                            {/* Calories input */}
                            <div className="flex items-center gap-1 text-zinc-400">
                              <Flame className="w-3 h-3 text-amber-500" />
                              <input
                                type="number"
                                value={item.calories || ''}
                                onChange={(e) => handleUpdateItem(item.id, { calories: Number(e.target.value) })}
                                placeholder="500"
                                className="w-10 bg-transparent text-[10px] font-mono border-b border-transparent hover:border-zinc-300 focus:outline-none"
                              />
                              <span>سعرة</span>
                            </div>

                            {/* Badge cycle button */}
                            <button
                              type="button"
                              onClick={() => cycleBadge(item)}
                              className="px-2 py-0.5 rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold transition-colors cursor-pointer flex items-center gap-1"
                              title="انقر لتبديل الشارة (جديد، عرض خاص، الأكثر طلباً، نفدت الكمية)"
                            >
                              <Tag className="w-3 h-3" />
                              <span>{item.badge ? `شارة: ${item.badge}` : '+ شارة'}</span>
                            </button>

                            {/* Delete meal button */}
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="text-zinc-300 hover:text-black p-1 transition-colors cursor-pointer"
                              title="حذف هذه الوجبة"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Add Meal Button for this Section */}
                    <button
                      onClick={() => handleAddNewItemToCategory(section.id)}
                      className="w-full py-3 rounded-2xl border-2 border-dashed border-zinc-200 hover:border-[#A33900] hover:bg-[#A33900]/5 text-zinc-500 hover:text-[#A33900] text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>إضافة صنف جديد لقسم "{section.labelAr}"</span>
                    </button>
                  </div>
                </section>
              ))}
            </div>

            {/* 4. Footer Contact Editable */}
            <div className="p-6 bg-zinc-50 border-t border-[#F1F1F4] text-center space-y-4">
              <h4 className="text-xs font-bold text-[#111111]">
                بيانات التواصل (انقر للتعديل)
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <input
                  type="text"
                  value={draft.contact.phone || ''}
                  onChange={(e) => updateContact('phone', e.target.value)}
                  placeholder="رقم الهاتف (+966...)"
                  className="p-2 rounded-xl border border-zinc-200 bg-white text-xs text-center focus:outline-none"
                />
                <input
                  type="text"
                  value={draft.contact.whatsapp || ''}
                  onChange={(e) => updateContact('whatsapp', e.target.value)}
                  placeholder="رقم الواتساب (+966...)"
                  className="p-2 rounded-xl border border-zinc-200 bg-white text-xs text-center focus:outline-none"
                />
              </div>
              <input
                type="text"
                value={draft.contact.locationNameAr || ''}
                onChange={(e) => updateContact('locationNameAr', e.target.value)}
                placeholder="العنوان (مثلاً: الرياض، حي الملقا)"
                className="w-full p-2 rounded-xl border border-zinc-200 bg-white text-xs text-center focus:outline-none"
              />
            </div>
          </div>
        </div>
        {draft.stitchDesignCode && (
          <section className={`w-full ${isMobileFrame ? 'max-w-[430px]' : 'max-w-none'} justify-self-center space-y-2`}>
            <div className="flex items-center justify-between px-2 text-xs font-bold text-zinc-700">
              <span className="flex items-center gap-2"><Eye className="w-4 h-4" /> محرر التصميم المباشر</span>
              <span className="text-[10px] text-zinc-500">انقر على النص أو الصورة داخل المنيو لتعديلها</span>
            </div>
            <div className={`h-[calc(100vh-150px)] min-h-[620px] overflow-hidden bg-white shadow-2xl ${isMobileFrame ? 'rounded-[28px] border-[7px] border-zinc-900' : 'rounded-xl border border-zinc-300'}`}>
              <iframe
                ref={stitchPreviewRef}
                title={`محرر تصميم ${draft.name}`}
                className="h-full w-full border-0 bg-white"
                sandbox="allow-scripts allow-forms allow-popups"
                referrerPolicy="strict-origin-when-cross-origin"
                srcDoc={stitchPreviewDocument}
                onLoad={() => {
                  stitchPreviewRef.current?.contentWindow?.postMessage({ type: 'MENU_DATA_UPDATE', payload: stitchMenuData }, '*');
                  stitchPreviewRef.current?.contentWindow?.postMessage({ type: 'MENU_EDITOR_MODE', enabled: true }, '*');
                }}
              />
            </div>
          </section>
        )}
      </div>

      {/* MODAL: IMAGE URL PROMPT */}
      {editingImageTarget && (
        <div className="fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
              <h3 className="text-sm font-bold text-[#111111]">
                {editingImageTarget.type === 'logo' ? 'تحديث رابط الشعار' : 'تحديث رابط صورة الوجبة'}
              </h3>
              <button onClick={() => setEditingImageTarget(null)} className="text-zinc-400 hover:text-black">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <input
                type="url"
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
                placeholder="https://..."
                className="w-full p-3 rounded-xl border border-zinc-200 text-xs focus:outline-none focus:border-[#A33900]"
                autoFocus
              />

              {imageUrlInput && (
                <div className="w-full h-36 rounded-xl overflow-hidden bg-zinc-100 border border-zinc-200 flex items-center justify-center">
                  <img
                    src={imageUrlInput}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingImageTarget(null)}
                className="px-4 py-2 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-600 hover:bg-zinc-50"
              >
                إلغاء
              </button>
              <button
                onClick={saveImageUrl}
                className="px-5 py-2 rounded-xl bg-black hover:bg-zinc-900 text-amber-400 border border-amber-400/30 text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                تطبيق الصورة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
