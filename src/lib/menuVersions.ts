import { collection, doc, runTransaction, serverTimestamp, deleteField } from 'firebase/firestore';
import { db } from './firebase';

// Only menu fields are versioned; client data and analytics must never be reverted accidentally.
const MENU_FIELDS = ['name', 'nameEn', 'slug', 'primaryColor', 'secondaryColor', 'type', 'logo', 'logoUrl', 'coverUrl', 'currency', 'statusText', 'statusTextEn', 'isActive', 'categories', 'menuGroups', 'products', 'items', 'contact', 'stitchDesignCode', 'updatedAt'] as const;
export function onlyMenuFields(data: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(MENU_FIELDS.filter(key => Object.prototype.hasOwnProperty.call(data, key)).map(key => [key, data[key]]));
}

/** Atomically preserve the currently published menu and publish a replacement. */
export async function publishVersionedMenu(id: string, updates: Record<string, unknown>, restore = false) {
  const ref = doc(db, 'restaurants', id);
  const historyRef = doc(collection(db, 'restaurants', id, 'versions'));
  await runTransaction(db, async transaction => {
    const current = await transaction.get(ref);
    if (!current.exists()) throw new Error('المنيو الأصلي غير موجود؛ لم يتم النشر.');
    const previous = onlyMenuFields(current.data());
    if (new Blob([JSON.stringify(previous)]).size > 850_000) throw new Error('النسخة الحالية كبيرة جدًا لحفظ نسخة احتياطية آمنة. قلّل حجم الصور أو التصميم أولًا.');
    transaction.set(historyRef, { menu: previous, createdAt: serverTimestamp() });
    const next = onlyMenuFields(updates);
    if (restore) for (const key of MENU_FIELDS) if (!(key in next)) next[key] = deleteField();
    transaction.set(ref, next, { merge: true });
  });
}
