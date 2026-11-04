import type { RestaurantData } from '../types/restaurant';
/** Public Firestore projection. Unknown and future admin fields are excluded by default. */
const fields = ['id','slug','name','nameEn','logo','logoUrl','coverUrl','primaryColor','secondaryColor','currency','statusText','statusTextEn','isActive','type','stitchDesignCode','layoutStyle','fontFamily','borderRadius','updatedAt'] as const;
const pick = (data: any, keys: readonly string[]) => Object.fromEntries(keys.filter(key => data?.[key] !== undefined).map(key => [key, data[key]]));
export function publicMenu(id: string, raw: any): RestaurantData {
  const categories = (raw.categories || []).map((c: any, index: number) => typeof c === 'string'
    ? { id: c, labelAr: c, labelEn: c } : { ...pick(c, ['id','labelAr','labelEn','sublabelEn','name','nameEn','icon','isActive']), id: c.id || `cat-${index}` });
  const products = (raw.products ?? raw.items ?? []).map((p: any, index: number) => ({
    ...pick(p, ['id','categoryId','nameAr','nameEn','descriptionAr','descriptionEn','price','originalPrice','calories','imageUrl','isPopular','isSpicy','isVegetarian','badge','isSoldOut']),
    id: p.id || `item-${index}`, categoryId: p.categoryId || p.category || categories[0]?.id || 'all',
    nameAr: p.nameAr || p.name || '', descriptionAr: p.descriptionAr || p.description || '',
    imageUrl: p.imageUrl || p.image || '', price: Number(p.price) || 0
  }));
  return JSON.parse(JSON.stringify({
    ...pick(raw, fields), id, slug: id, name: raw.name || id,
    logoUrl: raw.logoUrl || raw.logo || '', primaryColor: raw.primaryColor || '#A33900',
    isActive: raw.isActive !== false, categories, products,
    contact: pick(raw.contact, ['phone','whatsapp','maps','instagram','tiktok','locationNameAr','locationNameEn','workingHoursAr','workingHoursEn'])
  }));
}
