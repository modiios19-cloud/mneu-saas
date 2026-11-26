import React, { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { buildStitchDocument } from '../lib/stitchDesign';
import { RestaurantData } from '../types/restaurant';
import { MenuItemCard } from './MenuItemCard';
import { Footer } from './Footer';
import { MenuGroupBar } from './MenuGroupBar';
import { filterMenuGroup } from '../lib/menuGroups';

export function PublicMenuPreview({ token }: { token: string }) {
  const [menu, setMenu] = useState<RestaurantData | null>(null);
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [activeGroup, setActiveGroup] = useState('all');
  useEffect(() => {
    let alive = true;
    getDoc(doc(db, 'publicMenuPreviews', token)).then(snapshot => {
      if (!alive) return;
      if (!snapshot.exists()) return setStatus('error');
      setMenu(snapshot.data().menu as RestaurantData); setStatus('ready');
    }).catch(() => alive && setStatus('error'));
    return () => { alive = false; };
  }, [token]);
  if (status !== 'ready' || !menu) return <div dir="rtl" className="grid min-h-screen place-items-center p-8 text-center">{status === 'loading' ? 'جارٍ تحميل المعاينة…' : 'المعاينة غير متاحة أو انتهت صلاحيتها.'}</div>;
  const filtered = filterMenuGroup(menu.categories || [], menu.products || [], activeGroup);
  if (menu.stitchDesignCode?.trim()) {
    const data = { restaurant: { id: menu.id, slug: menu.slug, name: menu.name, nameEn: menu.nameEn, logoUrl: menu.logoUrl, primaryColor: menu.primaryColor, secondaryColor: menu.secondaryColor, currency: menu.currency, type: menu.type, contact: menu.contact, statusText: menu.statusText }, categories: filtered.categories, menuGroups: menu.menuGroups || [], products: filtered.products, offers: filtered.products.filter(p => p.badge === 'offer'), updatedAt: menu.updatedAt || null };
    return <div><div dir="rtl" className="bg-amber-100 p-2 text-center text-xs text-amber-900">معاينة خاصة قبل النشر · لا تغيّر المنيو المنشور</div><MenuGroupBar groups={menu.menuGroups} active={activeGroup} onSelect={setActiveGroup} primaryColor={menu.primaryColor}/><iframe title={`معاينة ${menu.name}`} className="block w-full min-h-screen border-0 bg-white" sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox" referrerPolicy="strict-origin-when-cross-origin" srcDoc={buildStitchDocument(menu.stitchDesignCode, data)}/></div>;
  }
  return <div dir="rtl" className="min-h-screen bg-white"><div className="bg-amber-100 p-2 text-center text-xs text-amber-900">معاينة خاصة قبل النشر · لا تغيّر المنيو المنشور</div><MenuGroupBar groups={menu.menuGroups} active={activeGroup} onSelect={setActiveGroup} primaryColor={menu.primaryColor}/><main className="mx-auto max-w-xl p-5"><h1 className="py-5 text-center text-2xl font-bold">{menu.name}</h1>{filtered.categories.filter(c => c.id !== 'all').map(category => <section key={category.id} className="mt-6"><h2 className="font-bold">{category.labelAr}</h2>{filtered.products.filter(p => p.categoryId === category.id).map(item => <MenuItemCard key={item.id} item={item} currency={menu.currency} primaryColor={menu.primaryColor}/>)}</section>)}<Footer contact={menu.contact || {}} restaurantName={menu.name} primaryColor={menu.primaryColor} lang="ar"/></main></div>;
}
