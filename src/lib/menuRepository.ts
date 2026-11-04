import { collection, doc, runTransaction, serverTimestamp, setDoc, Timestamp } from './dataStore';
import { db } from './firebase';
import { publicMenu } from './publicMenu';
import { toEditableMenu, toPreviewMenu } from './menuDrafts';
import type { RestaurantData } from '../types/restaurant';
const clean = (value: any) => JSON.parse(JSON.stringify(value));
/** The legacy source is now admin-only; every write atomically refreshes the public projection. */
export async function saveRestaurant(id: string, patch: any, options: { create?: boolean; archive?: boolean } = {}, database = db) {
  if (!/^[a-z0-9][a-z0-9_-]{0,119}$/.test(id)) throw new Error('معرّف المطعم غير صالح');
  const source = doc(database, 'restaurants', id);
  const published = doc(database, 'publicMenus', id);
  const version = doc(collection(database, 'menuVersions', id, 'versions'));
  await runTransaction(database, async transaction => {
    const existing = await transaction.get(source);
    if (options.create && existing.exists()) throw new Error('يوجد مطعم بهذا المعرّف بالفعل');
    if (!options.create && !existing.exists()) throw new Error('المطعم غير موجود');
    const previous = existing.exists() ? existing.data() : {};
    const merged = { ...previous, ...clean(patch), slug: id, updatedAt: new Date().toISOString() };
    if (options.archive && existing.exists()) transaction.set(version, { menu: publicMenu(id, previous), archivedAt: serverTimestamp() });
    transaction.set(source, merged);
    transaction.set(published, publicMenu(id, merged));
  });
}
const draftWrites = new Map<string, Promise<unknown>>();
export async function saveMenuDraft(id: string, draft: RestaurantData, database = db) {
  const menu = toEditableMenu(draft);
  if (new Blob([JSON.stringify(menu)]).size > 850_000) throw new Error('حجم المسودة كبير جدًا');
  const pending = (draftWrites.get(id) || Promise.resolve()).catch(() => {}).then(() => setDoc(doc(database, 'menuDrafts', id), { menu, updatedAt: serverTimestamp() }));
  draftWrites.set(id, pending);
  try { await pending; } finally { if (draftWrites.get(id) === pending) draftWrites.delete(id); }
}
export async function createMenuPreview(draft: RestaurantData, database = db) {
  if (!draft.stitchDesignCode?.trim()) throw new Error('أضف تصميم Stitch أولًا');
  const ref = doc(collection(database, 'menuPreviews'));
  await setDoc(ref, {
    restaurantId: draft.id, menu: toPreviewMenu(draft), designHtml: draft.stitchDesignCode,
    status: 'active', createdAt: serverTimestamp(), expiresAt: Timestamp.fromMillis(Date.now() + 7 * 86400000)
  });
  return ref.id;
}

let settingsWrites: Promise<unknown> = Promise.resolve();
export async function savePlatformSettings(settings: any) {
  const payload = clean(settings);
  const pending = settingsWrites.catch(() => {}).then(() => setDoc(doc(db, 'settings', 'general'), payload, { merge: true }));
  settingsWrites = pending;
  await pending;
}
