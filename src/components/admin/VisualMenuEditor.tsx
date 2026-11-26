import React, { useEffect, useMemo, useRef, useState } from 'react';
import { addDoc, collection, doc, getDoc, getDocs, orderBy, query, limit, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { buildStitchDocument, withPlatformContactLinks } from '../../lib/stitchDesign';
import { HtmlDesignInput, MAX_HTML_DESIGN_BYTES } from './HtmlDesignInput';
import { onlyMenuFields, publishVersionedMenu } from '../../lib/menuVersions';
import { menuUrl } from '../../lib/menuUrl';
import { whatsappDigits } from '../../lib/phone';
import { QRCodeModal } from './QRCodeModal';
import { ContactBar } from '../ContactBar';
import { MenuGroupBar } from '../MenuGroupBar';
import { filterMenuGroup } from '../../lib/menuGroups';
import { Footer } from '../Footer';
import { parseMenuImport } from '../../lib/importMenuData';
import { getContactLinks, safeWebUrl } from '../../lib/contactLinks';
import { isTemporaryMenuUrl } from '../../lib/menuUrl';
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
  onClose: () => void;
  onSaved: (updatedRestaurant: RestaurantData) => void;
  availableTypes?: { id: string; labelAr: string }[];
  publicBaseUrl?: string;
  openQrInitially?: boolean;
}

export const VisualMenuEditor: React.FC<VisualMenuEditorProps> = ({
  initialRestaurant,
  onClose,
  onSaved,
  publicBaseUrl,
  openQrInitially = false,
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

  const [showQr, setShowQr] = useState(openQrInitially);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeMenuGroup, setActiveMenuGroup] = useState('all');
  const activeGroup = activeMenuGroup === 'all' || (draft.menuGroups || []).some(group => group.id === activeMenuGroup) ? activeMenuGroup : 'all';
  const [isMobileFrame, setIsMobileFrame] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [creatingPreview, setCreatingPreview] = useState(false);
  const saveDraft = async () => {
    setSaving(true);
    try {
      const menu = JSON.parse(JSON.stringify(onlyMenuFields(draft as unknown as Record<string, unknown>)));
      if (new Blob([JSON.stringify(menu)]).size > 850_000) throw new Error('حجم المسودة كبير جدًا؛ قلّل حجم التصميم أو الصور أولًا.');
      await setDoc(doc(db, 'menuDrafts', initialRestaurant.id), { menu, updatedAt: serverTimestamp() });
      showToast('تم حفظ المسودة دون نشر المنيو');
    } catch (error) { alert(error instanceof Error ? error.message : 'تعذر حفظ المسودة.'); }
    finally { setSaving(false); }
  };
  const loadDraft = async () => {
    if (!confirm('تحميل المسودة سيستبدل التعديلات غير المحفوظة في المحرر. هل تريد المتابعة؟')) return;
    setSaving(true);
    try {
      const snapshot = await getDoc(doc(db, 'menuDrafts', initialRestaurant.id));
      if (!snapshot.exists()) { alert('لا توجد مسودة محفوظة لهذا المنيو.'); return; }
      setDraft(previous => ({ ...previous, ...snapshot.data().menu, id: previous.id, slug: previous.slug }));
      setPreviewUrl(''); showToast('تم تحميل المسودة؛ لم يتغير المنيو المنشور');
    } catch { alert('تعذر تحميل المسودة.'); }
    finally { setSaving(false); }
  };
  const createPreview = async () => {
    if (new Blob([draft.stitchDesignCode || '']).size > MAX_HTML_DESIGN_BYTES) return alert('التصميم أكبر من الحد المسموح.');
    setCreatingPreview(true); setPreviewUrl('');
    try {
      // Explicit public fields only: never include client details, internal notes or analytics.
      const menu = JSON.parse(JSON.stringify({ id: draft.id, slug: draft.slug, name: draft.name, nameEn: draft.nameEn, logoUrl: draft.logoUrl, primaryColor: draft.primaryColor, secondaryColor: draft.secondaryColor, currency: draft.currency, type: draft.type, statusText: draft.statusText, categories: draft.categories, menuGroups: draft.menuGroups || [], products: draft.products, contact: draft.contact, stitchDesignCode: draft.stitchDesignCode, updatedAt: draft.updatedAt }));
      const ref = await addDoc(collection(db, 'publicMenuPreviews'), { menu, createdAt: serverTimestamp(), expiresAt: Timestamp.fromDate(new Date(Date.now() + 7 * 86400000)) });
      const link = new URL(menuUrl(draft.slug, publicBaseUrl)); link.search = ''; link.searchParams.set('preview', ref.id);
      setPreviewUrl(link.toString());
    } catch (error) { alert('تعذر إنشاء المعاينة. تأكد من الاتصال ومن نشر قواعد المعاينة في Firebase.'); console.error(error); }
    finally { setCreatingPreview(false); }
  };
  const [versions, setVersions] = useState<{ id: string; menu: Record<string, unknown>; date: string }[]>([]);
  const [versionError, setVersionError] = useState('');
  const loadVersions = async () => {
    try {
      const snapshots = await getDocs(query(collection(db, 'restaurants', initialRestaurant.id, 'versions'), orderBy('createdAt', 'desc'), limit(20)));
      setVersions(snapshots.docs.map(item => ({ id: item.id, menu: item.data().menu || {}, date: item.data().createdAt?.toDate?.().toLocaleString('ar') || 'نسخة سابقة' })));
      setVersionError('');
    } catch { setVersionError('تعذر تحميل النسخ السابقة.'); }
  };
  const restoreVersion = async (menu: Record<string, unknown>) => {
    if (!confirm('استعادة هذه النسخة ستنشر المنيو القديم وتحفظ نسخة من الحالي. هل تريد المتابعة؟')) return;
    setSaving(true);
    try { await publishVersionedMenu(initialRestaurant.id, menu, true); window.location.reload(); }
    catch (error) { alert(error instanceof Error ? error.message : 'تعذرت الاستعادة.'); setSaving(false); }
  };
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const stitchPreviewRef = useRef<HTMLIFrameElement>(null);
  const editorCanvasRef = useRef<HTMLDivElement>(null);
  const importMenuFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!/\.json$/i.test(file.name) || file.size > 400_000) { alert('اختر ملف JSON بحجم لا يتجاوز 400 كيلوبايت.'); return; }
    try {
      const menu = parseMenuImport(await file.text());
      if (!confirm('سيستبدل الاستيراد بيانات المنيو الحالية في المحرر، بما فيها الأقسام والأصناف وبيانات التواصل الموجودة في الملف. لن يغير التصميم أو بيانات العميل، ولن ينشر حتى تضغط حفظ. هل تريد المتابعة؟')) return;
      setDraft(previous => ({ ...previous, ...menu }));
      setActiveCategory('all'); setActiveMenuGroup('all'); setPreviewUrl('');
      showToast('تم تحميل البيانات في المحرر فقط؛ احفظ إذا أردت نشرها');
    } catch (error) { alert(error instanceof Error ? `تعذر استيراد البيانات: ${error.message}` : 'تعذر قراءة ملف البيانات.'); }
  };

  // Modal for changing an image URL
  const [editingImageTarget, setEditingImageTarget] = useState<{
    type: 'logo' | 'item';
    itemId?: string;
    bindingKey?: string;
    currentUrl: string;
  } | null>(null);
  const [imageUrlInput, setImageUrlInput] = useState('');

  const primaryColor = draft.primaryColor || '#A33900';
  const filteredDraftMenu = useMemo(() => filterMenuGroup(draft.categories, draft.products, activeGroup), [draft.categories, draft.products, activeGroup]);
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
    categories: filteredDraftMenu.categories,
    menuGroups: draft.menuGroups || [],
    products: filteredDraftMenu.products,
    offers: filteredDraftMenu.products.filter((item) => item.badge === 'offer'),
    updatedAt: draft.updatedAt || null
  }), [draft, primaryColor, filteredDraftMenu]);
  const stitchPreviewDocument = useMemo(
    () => draft.stitchDesignCode ? buildStitchDocument(draft.stitchDesignCode, {
      restaurant: {}, categories: [], products: [], offers: [], updatedAt: null
    }) : '',
    [draft.stitchDesignCode]
  );

  useEffect(() => {
    stitchPreviewRef.current?.contentWindow?.postMessage({ type: 'MENU_DATA_UPDATE', payload: withPlatformContactLinks(stitchMenuData) }, '*');
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
      const contactFields = ['phone', 'whatsapp', 'maps', 'instagram', 'facebook', 'tiktok', 'locationNameAr', 'workingHoursAr'];
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
      sublabelEn: newName.trim().toUpperCase(),
      ...(activeGroup !== 'all' ? { menuGroupId: activeGroup } : {})
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
    if (new Blob([draft.stitchDesignCode || '']).size > MAX_HTML_DESIGN_BYTES) {
      alert('حجم تصميم HTML يتجاوز 400 كيلوبايت. استخدم روابط مستضافة للصور والخطوط بدل تضمينها داخل الكود.');
      return;
    }
    if (draft.stitchDesignCode?.trim() && !/<!doctype\s+html|<html[\s>]/i.test(draft.stitchDesignCode)) {
      alert('استخدم مستند HTML كاملًا، وليس JSX أو إعدادات JSON.');
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
        menuGroups: draft.menuGroups || [],
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

      // Remove undefined optional fields before writing; Firestore rejects undefined values.
      const safePayload = JSON.parse(JSON.stringify(payload));
      await publishVersionedMenu(initialRestaurant.id, safePayload);

      showToast('🎉 تم حفظ ونشر جميع التعديلات المرئية إلى Firebase بنجاح!');
      onSaved({ ...draft, slug: cleanSlug });
    } catch (err: any) {
      console.error('Error publishing to Firestore:', err);
      alert(`حدث خطأ أثناء النشر إلى Firebase: ${err?.message || err}`);
    } finally {
      setSaving(false);
    }
  };

  // Filter products by selected active category
  const categoriesWithProducts = filteredDraftMenu.categories.map((cat: Category) => {
    if (cat.id === 'all') {
      return {
        ...cat,
        items: filteredDraftMenu.products
      };
    }
    return {
      ...cat,
      items: filteredDraftMenu.products.filter((p: MenuItem) => p.categoryId === cat.id)
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
              readOnly
              title="معرّف ثابت للحفاظ على روابط وQR المنشورة"
              className="w-24 bg-transparent font-mono font-bold text-white focus:outline-none"
              placeholder="slug"
            />
          </div>

          <button type="button" onClick={() => setShowQr(true)} className="rounded-xl border border-amber-400/40 px-3 py-2 text-xs text-amber-300">رابط المنيو و QR</button>

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

      {/* The whole editor body scrolls, including all expanded sections. */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain" aria-label="محتوى محرر المنيو">
      <div className="flex justify-end bg-zinc-950 px-4 pt-3"><button type="button" onClick={() => editorCanvasRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="rounded-lg border border-amber-300/40 px-3 py-2 text-xs font-bold text-amber-300">الانتقال لمعاينة المنيو ↓</button></div>
      <details className="z-30 bg-zinc-950 text-white border-b border-zinc-800 px-4 py-3">
        <summary className="cursor-pointer text-xs font-bold text-amber-300">معاينة للعميل قبل النشر</summary>
        <div className="mx-auto max-w-5xl space-y-2 pt-3 text-xs text-zinc-300">
          <p>احفظ مسودة خاصة للعودة إليها لاحقًا، أو أنشئ رابطًا غير مدرج ينتهي بعد 7 أيام لنسخة من التعديلات الحالية دون تغيير المنيو المنشور. كل من يمتلك الرابط يمكنه رؤيته.</p>
          <div className="flex flex-wrap gap-2"><button disabled={saving} onClick={saveDraft} className="rounded-lg border border-white/20 px-3 py-2">حفظ المسودة</button><button disabled={saving} onClick={loadDraft} className="rounded-lg border border-white/20 px-3 py-2">تحميل المسودة المحفوظة</button></div>
          {isTemporaryMenuUrl(menuUrl(draft.slug, publicBaseUrl)) && <p className="text-amber-300">هذا عنوان معاينة مؤقت؛ استخدم الموقع المنشور عند مشاركة المعاينة مع العميل.</p>}
          <button disabled={creatingPreview} onClick={createPreview} className="rounded-lg border border-amber-300/40 px-3 py-2 text-amber-300">{creatingPreview ? 'جارٍ الإنشاء…' : 'إنشاء رابط المعاينة'}</button>
          {previewUrl && <div className="space-y-2"><div dir="ltr" className="break-all">{previewUrl}</div><div className="flex flex-wrap gap-2"><button onClick={() => navigator.clipboard.writeText(previewUrl)} className="rounded-lg bg-white/10 px-3 py-2">نسخ الرابط</button><a href={previewUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-white/10 px-3 py-2">فتح المعاينة</a>{draft.client?.phone && <a target="_blank" rel="noopener noreferrer" href={`https://wa.me/${whatsappDigits(draft.client.phone)}?text=${encodeURIComponent(`مرحبًا، هذه معاينة منيو ${draft.name} قبل النشر: ${previewUrl}`)}`} className="rounded-lg bg-green-700 px-3 py-2">فتح واتساب العميل</a>}</div><p>الرابط لقطة ثابتة؛ أنشئ رابطًا جديدًا بعد تعديل المسودة.</p></div>}
        </div>
      </details>

      <details onToggle={(event) => { if (event.currentTarget.open) void loadVersions(); }} className="z-30 bg-zinc-950 text-white border-b border-zinc-800 px-4 py-3">
        <summary className="cursor-pointer text-xs font-bold text-amber-300">النسخ السابقة واستعادة المنيو</summary>
        <div className="mx-auto max-w-5xl space-y-2 pt-3 text-xs text-zinc-300">
          <p>تُحفظ نسخة من المنيو المنشور قبل كل نشر جديد. الاستعادة تنشر النسخة السابقة وتحفظ الحالية أولًا.</p>
          {versionError && <p className="text-red-300">{versionError}</p>}
          {!versions.length && !versionError && <p>لا توجد نسخ سابقة بعد، أو جارٍ التحميل.</p>}
          {versions.map(version => <div key={version.id} className="flex items-center justify-between gap-2 rounded-lg bg-white/5 p-2"><span>{version.date}</span><button disabled={saving} onClick={() => restoreVersion(version.menu)} className="rounded-lg border border-amber-300/40 px-3 py-2 text-amber-300">استعادة</button></div>)}
        </div>
      </details>

      <details className="bg-zinc-950 text-white border-b border-zinc-800 px-4 py-3">
        <summary className="cursor-pointer text-sm font-bold text-amber-300">استيراد بيانات المنيو التجريبية</summary>
        <div className="mx-auto max-w-5xl space-y-3 pt-3 text-xs text-zinc-300">
          <p>اختر ملف بيانات المنيو بصيغة JSON لملء الأصناف والهوية وروابط التواصل داخل المحرر. ستظل التغييرات غير منشورة حتى تضغط «حفظ ونشر».</p>
          <label className="inline-flex cursor-pointer rounded-lg border border-amber-300/40 px-3 py-2 font-bold text-amber-300">اختيار ملف بيانات JSON<input type="file" accept=".json,application/json" className="sr-only" onChange={importMenuFile}/></label>
        </div>
      </details>

      <details className="bg-zinc-950 text-white border-b border-zinc-800 px-4 py-3">
        <summary className="cursor-pointer text-sm font-bold text-amber-300">أيقونات وروابط التواصل</summary>
        <div className="mx-auto max-w-5xl space-y-3 pt-3 text-xs text-zinc-300">
          <section className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-4">
            <div><h3 className="text-sm font-bold text-amber-300">روابط تواصل المنشأة</h3><p className="mt-1 text-zinc-400">أدخل رقم المحل للاتصال ورقم واتساب، ثم روابط الحسابات والموقع. اترك أي حقل فارغًا لإخفاء أيقونته. بعد التعديل اضغط «حفظ ونشر».</p></div>
            <div className="grid gap-3 sm:grid-cols-2">
              {([
                ['phone', 'رقم الاتصال', '+967 771234567'],
                ['whatsapp', 'رقم واتساب للمحادثة', '+967 771234567'],
                ['maps', 'رابط موقع Google Maps', 'https://maps.app.goo.gl/...'],
                ['instagram', 'رابط إنستقرام', 'https://instagram.com/...'],
                ['facebook', 'رابط فيسبوك', 'https://facebook.com/...'],
                ['tiktok', 'رابط تيك توك', 'https://tiktok.com/@...'],
                ['locationNameAr', 'اسم أو وصف العنوان (اختياري)', 'صنعاء، شارع ...'],
              ] as const).map(([key, label, placeholder]) => <label key={key} className="space-y-1"><span>{label}</span><input type="text" dir={key === 'locationNameAr' ? 'rtl' : 'ltr'} value={draft.contact[key] || ''} onChange={e => updateContact(key, e.target.value)} placeholder={placeholder} className="w-full rounded-xl border border-white/10 bg-zinc-900 p-2.5 text-sm text-white focus:border-amber-400 focus:outline-none"/></label>)}
            </div>
            <p className="text-zinc-400">الأرقام اليمنية المحلية تُحوّل تلقائيًا إلى +967؛ ويمكن إدخال مفتاح دولة آخر. الروابط الخارجية تحتاج رابطًا صالحًا.</p>
            {(['phone', 'whatsapp'] as const).filter(key => draft.contact[key]?.trim() && !getContactLinks(draft.contact).some(link => link.kind === key)).map(key => <p key={key} className="text-amber-300">تحقق من رقم {key === 'phone' ? 'الاتصال' : 'واتساب'}؛ لن يظهر الزر حتى يكون الرقم صالحًا.</p>)}
            {(['maps', 'instagram', 'facebook', 'tiktok'] as const).filter(key => draft.contact[key]?.trim() && !safeWebUrl(draft.contact[key])).map(key => <p key={key} className="text-amber-300">تحقق من رابط {key}؛ لن يظهر الزر حتى يكون الرابط صالحًا.</p>)}
          </section>
          <p className="text-zinc-400">معاينة الأيقونات: تظهر الأيقونة معطلة هنا إلى أن تضيف بياناتها. في منيو الزبون لا تظهر الأيقونات غير المكتملة.</p>
          <ContactBar contact={draft.contact} primaryColor={primaryColor} showMissing />
        </div>
      </details>

      <details className="z-30 bg-zinc-950 text-white border-b border-zinc-800 px-4 py-3">
        <summary className="cursor-pointer text-xs font-bold text-amber-300">القوائم الداخلية والتعديلات السريعة</summary>
        <div className="mx-auto max-w-5xl space-y-4 pt-3 text-xs text-zinc-300">
          <p>يمكنك إنشاء صبوح وغداء وعشاء داخل المنيو الواحد وربط كل قسم بالقائمة المناسبة. تظهر التغييرات للزوار بعد الحفظ والنشر.</p>
          <div className="flex flex-wrap items-center gap-2"><span>إضافة سريعة:</span>{['صبوح', 'غداء', 'عشاء'].map(name => <button key={name} type="button" disabled={(draft.menuGroups || []).some(g => g.labelAr === name)} onClick={() => setDraft(prev => ({ ...prev, menuGroups: [...(prev.menuGroups || []), { id: `menu-${Date.now()}-${name}`, labelAr: name }] }))} className="rounded-lg border border-amber-300/40 px-3 py-2 text-amber-300 disabled:opacity-40">+ {name}</button>)}</div>
          <div className="flex flex-wrap gap-2">{(draft.menuGroups || []).map(group => <span key={group.id} className="rounded-lg bg-white/10 px-3 py-2">{group.labelAr} <button onClick={() => { if (confirm('حذف اسم القائمة الداخلية؟ لن تُحذف الأقسام أو الأصناف.')) setDraft(prev => ({ ...prev, menuGroups: (prev.menuGroups || []).filter(g => g.id !== group.id), categories: prev.categories.map(c => c.menuGroupId === group.id ? { ...c, menuGroupId: undefined } : c) })); }} className="mr-2 text-red-300" aria-label={`حذف ${group.labelAr}`}>×</button></span>)}<button onClick={() => { const name = prompt('اسم القائمة الداخلية (مثل صبوح):')?.trim(); if (name) setDraft(prev => ({ ...prev, menuGroups: [...(prev.menuGroups || []), { id: `menu-${Date.now()}`, labelAr: name }] })); }} className="rounded-lg border border-amber-300/40 px-3 py-2 text-amber-300">+ قائمة داخلية</button></div>
          <button onClick={handleAddCategory} className="rounded-lg border border-white/20 px-3 py-2">+ إضافة قسم</button>
          <div className="space-y-2">{draft.categories.filter(c => c.id !== 'all').map(category => <label key={category.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-white/5 p-2"><span className="min-w-28">القسم: {category.labelAr}</span><select value={category.menuGroupId || ''} onChange={e => setDraft(prev => ({ ...prev, categories: prev.categories.map(c => c.id === category.id ? { ...c, menuGroupId: e.target.value || undefined } : c) }))} className="rounded-lg bg-zinc-800 p-2"><option value="">بدون قائمة داخلية</option>{(draft.menuGroups || []).map(g => <option key={g.id} value={g.id}>{g.labelAr}</option>)}</select><button type="button" onClick={() => handleAddNewItemToCategory(category.id)} className="rounded-lg border border-white/20 px-2 py-2">+ إضافة صنف للقسم</button></label>)}</div>
          <p>بعد إضافة قائمة، اخترها من أمام كل قسم لربطه بها. ستظهر أزرار القوائم في المعاينة أسفل المحرر. تصميم HTML المخصص يجب أن يقرأ البيانات المرسلة ليعكس التصفية.</p>

          <div className="space-y-2">{draft.products.map(item => <div key={item.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-white/5 p-2"><span className="min-w-32 flex-1">{item.nameAr}</span><label>السعر <input aria-label={`سعر ${item.nameAr}`} type="number" min="0" value={item.price} onChange={e => handleUpdateItem(item.id, { price: Number(e.target.value) || 0 })} className="w-20 rounded-lg bg-zinc-800 p-2"/></label><button onClick={() => handleUpdateItem(item.id, { isSoldOut: !item.isSoldOut })} className="rounded-lg border border-white/20 px-2 py-2">{item.isSoldOut ? 'إعادة الإتاحة' : 'نفد مؤقتًا'}</button><button onClick={() => handleDeleteItem(item.id)} className="rounded-lg border border-red-400/30 px-2 py-2 text-red-300">حذف</button></div>)}</div>
        </div>
      </details>

      {/* WORKSPACE CANVAS */}
      <details className="z-30 bg-zinc-950 text-white border-b border-zinc-800 px-4 py-3">
          <summary className="cursor-pointer text-xs font-bold text-amber-300">إضافة / استبدال تصميم HTML</summary>
          <div className="max-w-5xl mx-auto pt-3">
            <HtmlDesignInput value={draft.stitchDesignCode || ''} onChange={(value) => updateField('stitchDesignCode', value)} />
          </div>
      </details>
      <div ref={editorCanvasRef} className="p-2 sm:p-4 xl:p-6 bg-[#18181b] flex justify-center items-start">
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

            <MenuGroupBar groups={draft.menuGroups} active={activeGroup} onSelect={id => { setActiveMenuGroup(id); setActiveCategory('all'); }} primaryColor={primaryColor}/>

            {/* 2. Interactive Category Tabs with (+) Button */}
            <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-[#F1F1F4] px-4 flex items-center gap-4 overflow-x-auto no-scrollbar">
              {filteredDraftMenu.categories.map((cat) => {
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

            <Footer contact={draft.contact} restaurantName={draft.name} primaryColor={primaryColor} lang="ar" />
          </div>
        </div>
        {draft.stitchDesignCode && (
          <section className={`w-full ${isMobileFrame ? 'max-w-[430px]' : 'max-w-none'} justify-self-center space-y-2`}>
            <div className="flex items-center justify-between px-2 text-xs font-bold text-zinc-200">
              <span className="flex items-center gap-2"><Eye className="w-4 h-4" /> محرر التصميم المباشر</span>
              <span className="text-[10px] text-zinc-500">انقر على النص أو الصورة داخل المنيو لتعديلها</span>
            </div>
            <div className={`flex h-[calc(100vh-150px)] min-h-[620px] flex-col overflow-hidden bg-white shadow-2xl ${isMobileFrame ? 'rounded-[28px] border-[7px] border-zinc-900' : 'rounded-xl border border-zinc-300'}`}>
              <MenuGroupBar groups={draft.menuGroups} active={activeGroup} onSelect={id => { setActiveMenuGroup(id); setActiveCategory('all'); }} primaryColor={primaryColor}/>
              <iframe
                ref={stitchPreviewRef}
                title={`محرر تصميم ${draft.name}`}
                className="min-h-0 flex-1 w-full border-0 bg-white"
                sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
                referrerPolicy="strict-origin-when-cross-origin"
                srcDoc={stitchPreviewDocument}
                onLoad={() => {
                  stitchPreviewRef.current?.contentWindow?.postMessage({ type: 'MENU_DATA_UPDATE', payload: withPlatformContactLinks(stitchMenuData) }, '*');
                  stitchPreviewRef.current?.contentWindow?.postMessage({ type: 'MENU_EDITOR_MODE', enabled: true }, '*');
                }}
              />
            </div>
          </section>
        )}
      </div>
      </div>

      {/* MODAL: IMAGE URL PROMPT */}
      {editingImageTarget && (
        <div className="fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#272729] border border-zinc-700 text-zinc-100 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-700 pb-2">
              <h3 className="text-sm font-bold text-white">
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
                className="w-full p-3 rounded-xl border border-zinc-700 bg-zinc-900 text-white text-xs focus:outline-none focus:border-amber-400"
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
                className="px-4 py-2 rounded-xl border border-zinc-700 text-xs font-bold text-zinc-200 hover:bg-zinc-800"
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
      {showQr && <div className="relative z-[200]"><QRCodeModal restaurant={draft} publicBaseUrl={publicBaseUrl} isOpen onClose={() => setShowQr(false)} /></div>}
    </div>
  );
};
