import { RestaurantContact } from '../types/restaurant';
import { normalizePhone, whatsappDigits } from './phone';

export type ContactLink = { kind: 'phone' | 'whatsapp' | 'maps' | 'instagram' | 'facebook' | 'tiktok'; href: string; label: string };

/** Accept only ordinary public web URLs, including links pasted without the scheme. */
export function safeWebUrl(input?: string): string | undefined {
  const value = input?.trim();
  if (!value || /\s/.test(value)) return undefined;
  if (/^[a-z][a-z0-9+.-]*:/i.test(value) && !/^https?:\/\//i.test(value)) return undefined;
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname.includes('.') || url.username || url.password) return undefined;
    return url.href;
  } catch { return undefined; }
}

export function getContactLinks(contact: RestaurantContact): ContactLink[] {
  const links: ContactLink[] = [];
  const phone = normalizePhone(contact.phone || '');
  const whatsapp = whatsappDigits(contact.whatsapp || '');
  // Accept both mobile and landline formats without guessing the provider.
  if (phone.replace(/\D/g, '').length >= 8 && phone.replace(/\D/g, '').length <= 15) links.push({ kind: 'phone', href: `tel:${phone}`, label: 'اتصال' });
  if (whatsapp.length >= 8 && whatsapp.length <= 15) links.push({ kind: 'whatsapp', href: `https://wa.me/${whatsapp}`, label: 'واتساب' });
  const fields = [
    ['maps', contact.maps, 'الموقع'],
    ['instagram', contact.instagram, 'إنستقرام'],
    ['facebook', contact.facebook, 'فيسبوك'],
    ['tiktok', contact.tiktok, 'تيك توك'],
  ] as const;
  fields.forEach(([kind, value, label]) => { const href = safeWebUrl(value); if (href) links.push({ kind, href, label }); });
  return links;
}
