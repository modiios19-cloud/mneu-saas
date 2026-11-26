import { Category, MenuItem, RestaurantContact, RestaurantData, MenuGroup } from '../types/restaurant';

type MenuImport = Partial<Pick<RestaurantData, 'name' | 'nameEn' | 'logoUrl' | 'primaryColor' | 'secondaryColor' | 'currency' | 'statusText' | 'categories' | 'products' | 'contact' | 'menuGroups'>>;
const string = (value: unknown) => typeof value === 'string' ? value : '';
const keyOk = (value: unknown) => typeof value === 'string' && value.length > 0 && value.length <= 100 && !value.includes(':');
/** Import only public menu fields, never a client, slug, design, analytics, or privileged metadata. */
export function parseMenuImport(source: string): MenuImport {
  const data = JSON.parse(source);
  if (!data || typeof data !== 'object' || !Array.isArray(data.categories) || !Array.isArray(data.products)) throw new Error('يجب أن يحتوي الملف على مصفوفتَي categories وproducts.');
  if (data.categories.length > 150 || data.products.length > 1000) throw new Error('عدد الأقسام أو الأصناف يتجاوز الحد المسموح.');
  const ids = new Set<string>();
  const categories: Category[] = data.categories.map((item: any) => {
    if (!item || !keyOk(item.id) || !string(item.labelAr).trim() || ids.has(item.id)) throw new Error('تأكد أن لكل قسم اسمًا ومعرّفًا فريدًا.');
    ids.add(item.id);
    return { id: item.id, labelAr: item.labelAr, ...(string(item.labelEn) ? { labelEn: item.labelEn } : {}), ...(keyOk(item.menuGroupId) ? { menuGroupId: item.menuGroupId } : {}) };
  });
  const productsSeen = new Set<string>();
  const products: MenuItem[] = data.products.map((item: any) => {
    const price = Number(item?.price);
    if (!item || !keyOk(item.id) || productsSeen.has(item.id) || !ids.has(item.categoryId) || !string(item.nameAr).trim() || !Number.isFinite(price) || price < 0) throw new Error('تحقق من اسم كل صنف ومعرّفه وسعره والقسم المرتبط به.');
    productsSeen.add(item.id);
    const product: MenuItem = { id: item.id, categoryId: item.categoryId, nameAr: item.nameAr, descriptionAr: string(item.descriptionAr), price, imageUrl: string(item.imageUrl) };
    for (const key of ['nameEn','descriptionEn','badge'] as const) if (typeof item[key] === 'string') product[key] = item[key];
    for (const key of ['isPopular','isSpicy','isVegetarian','isSoldOut'] as const) if (typeof item[key] === 'boolean') product[key] = item[key];
    for (const key of ['originalPrice','calories'] as const) if (item[key] != null && Number.isFinite(Number(item[key])) && Number(item[key]) >= 0) product[key] = Number(item[key]);
    return product;
  });
  const result: MenuImport = { categories, products };
  for (const field of ['name','nameEn','logoUrl','primaryColor','secondaryColor','currency','statusText'] as const) if (typeof data[field] === 'string') result[field] = data[field];
  if (data.contact && typeof data.contact === 'object') {
    const contact: RestaurantContact = {};
    for (const field of ['phone','whatsapp','maps','instagram','facebook','tiktok','locationNameAr','locationNameEn','workingHoursAr','workingHoursEn'] as const) if (typeof data.contact[field] === 'string') contact[field] = data.contact[field];
    result.contact = contact;
  }
  if (Array.isArray(data.menuGroups)) {
    const groupsSeen = new Set<string>();
    result.menuGroups = data.menuGroups.map((group: any): MenuGroup => {
      if (!group || !keyOk(group.id) || groupsSeen.has(group.id) || !string(group.labelAr).trim()) throw new Error('تأكد من أسماء ومعرّفات القوائم الداخلية.');
      groupsSeen.add(group.id);
      return { id: group.id, labelAr: group.labelAr, ...(string(group.labelEn) ? { labelEn: group.labelEn } : {}) };
    });
    if (categories.some(c => c.menuGroupId && !groupsSeen.has(c.menuGroupId))) throw new Error('أحد الأقسام مرتبط بقائمة داخلية غير موجودة.');
  }
  return result;
}
