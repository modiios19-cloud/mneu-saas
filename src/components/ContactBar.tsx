import React from 'react';
import { Facebook, Instagram, MapPin, MessageCircle, Music2, Phone } from 'lucide-react';
import { RestaurantContact } from '../types/restaurant';
import { getContactLinks } from '../lib/contactLinks';

const icons = { phone: Phone, whatsapp: MessageCircle, maps: MapPin, instagram: Instagram, facebook: Facebook, tiktok: Music2 };
const labels = { phone: 'اتصال', whatsapp: 'واتساب', maps: 'الموقع', instagram: 'إنستقرام', facebook: 'فيسبوك', tiktok: 'تيك توك' };
type Kind = keyof typeof icons;
/** Missing icons are shown as disabled placeholders only in the editor. */
export function ContactBar({ contact, primaryColor, showMissing = false }: { contact: RestaurantContact; primaryColor?: string; showMissing?: boolean }) {
  const links = getContactLinks(contact || {});
  if (!links.length && !showMissing) return null;
  const visible: Kind[] = showMissing ? ['phone', 'whatsapp', 'maps', 'instagram', 'facebook', 'tiktok'] : links.map(link => link.kind);
  return <nav dir="rtl" aria-label="روابط التواصل" className="flex flex-wrap items-center justify-center gap-2 bg-white px-3 py-2 text-xs shadow-sm" style={{ borderBottom: `2px solid ${primaryColor || '#A33900'}` }}>
    {visible.map(kind => {
      const link = links.find(item => item.kind === kind);
      const Icon = icons[kind];
      const content = <><Icon size={16} style={{ color: link ? primaryColor || '#A33900' : '#a1a1aa' }}/><span>{labels[kind]}</span></>;
      return link ? <a key={kind} href={link.href} target={kind === 'phone' ? undefined : '_blank'} rel={kind === 'phone' ? undefined : 'noopener noreferrer'} aria-label={link.label} className="inline-flex items-center gap-1 rounded-full border border-zinc-200 px-3 py-2 font-bold text-zinc-800 hover:bg-zinc-50">{content}</a>
        : <span key={kind} aria-label={`${labels[kind]} غير مضاف`} title="أضف البيانات لتفعيل الأيقونة" className="inline-flex items-center gap-1 rounded-full border border-dashed border-zinc-200 px-3 py-2 font-bold text-zinc-400">{content}</span>;
    })}
  </nav>;
}
