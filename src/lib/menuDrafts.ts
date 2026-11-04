import type { RestaurantData } from '../types/restaurant';
import type { StitchMenuData } from './stitchDesign';

/** Strip undefined optional fields so Firestore accepts records loaded from older menus. */
function withoutUndefined<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Explicitly select editable/public menu fields: never copy client contacts or internal analytics. */
export function toEditableMenu(draft: RestaurantData) {
  return withoutUndefined({
    id: draft.id,
    slug: draft.slug,
    name: draft.name,
    nameEn: draft.nameEn || '',
    logoUrl: draft.logoUrl || '',
    coverUrl: draft.coverUrl || '',
    primaryColor: draft.primaryColor,
    secondaryColor: draft.secondaryColor || '',
    currency: draft.currency || 'ر.س',
    type: draft.type || 'restaurant',
    statusText: draft.statusText || '',
    statusTextEn: draft.statusTextEn || '',
    isActive: draft.isActive !== false,
    contact: { ...draft.contact },
    categories: draft.categories.map((c) => ({ ...c })),
    products: draft.products.map((p) => ({ ...p })),
    stitchDesignCode: draft.stitchDesignCode || ''
  });
}

export function toPreviewMenu(draft: RestaurantData): StitchMenuData {
  const menu = toEditableMenu(draft);
  return {
    restaurant: {
      id: menu.id,
      slug: menu.slug,
      name: menu.name,
      nameEn: menu.nameEn,
      logoUrl: menu.logoUrl,
      primaryColor: menu.primaryColor,
      secondaryColor: menu.secondaryColor,
      currency: menu.currency,
      type: menu.type,
      contact: menu.contact,
      statusText: menu.statusText
    },
    categories: menu.categories,
    products: menu.products,
    offers: menu.products.filter((product) => product.badge === 'offer'),
    updatedAt: null
  };
}

export function makePreviewUrl(baseUrl: string, token: string): string {
  if (!baseUrl.trim()) throw new Error('أضف رابط الموقع العام من إعدادات المنصة قبل إرسال معاينة لعميل.');
  const url = new URL(baseUrl.trim());
  if (url.protocol !== 'https:') throw new Error('رابط الموقع يجب أن يستخدم HTTPS.');
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === 'aistudio.google.com' || url.hostname.endsWith('.aistudio.google.com')) {
    throw new Error('رابط معاينة AI Studio أو الرابط المحلي لا يصلح للمشاركة. أدخل رابط الاستضافة العامة.');
  }
  url.search = '';
  url.hash = '';
  url.searchParams.set('preview', token);
  return url.toString();
}

export function whatsappPreviewMessage(venueName: string, previewUrl: string, clientName?: string): string {
  return `مرحبًا ${clientName || ''} 👋
هذه معاينة تصميم المنيو الجديد لمطعم/مقهى ${venueName}.
يمكنك فتح الرابط ومراجعة الشكل والأصناف، ثم إرسال ملاحظاتك قبل الاعتماد النهائي:
${previewUrl}

هذه معاينة للمراجعة، ولم يتم نشر التعديلات بعد.`;
}

export function whatsappLink(phone: string, message: string): string {
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.length < 8 || digits.length > 15) throw new Error('يرجى إدخال رقم واتساب العميل بالصيغة الدولية.');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
