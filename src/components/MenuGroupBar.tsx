import React from 'react';
import { MenuGroup } from '../types/restaurant';

type Props = { groups?: MenuGroup[]; active: string; onSelect: (id: string) => void; primaryColor?: string; lang?: 'ar' | 'en' };
export function MenuGroupBar({ groups = [], active, onSelect, primaryColor = '#A33900', lang = 'ar' }: Props) {
  if (!groups.length) return null;
  const options = [{ id: 'all', labelAr: 'كل القوائم', labelEn: 'All menus' }, ...groups];
  return <nav dir={lang === 'ar' ? 'rtl' : 'ltr'} aria-label={lang === 'ar' ? 'قوائم المطعم' : 'Restaurant menus'} className="flex items-center gap-2 overflow-x-auto border-b border-zinc-200 bg-white px-3 py-3 text-xs">
    {options.map(group => <button type="button" key={group.id} aria-pressed={active === group.id} onClick={() => onSelect(group.id)} className="shrink-0 rounded-full border px-4 py-2 font-bold transition-colors" style={active === group.id ? { backgroundColor: primaryColor, borderColor: primaryColor, color: '#fff' } : { borderColor: '#e4e4e7', color: '#3f3f46', backgroundColor: '#fff' }}>{lang === 'ar' ? group.labelAr : group.labelEn || group.labelAr}</button>)}
  </nav>;
}
