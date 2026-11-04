import { describe, expect, test } from 'bun:test';
import { makePreviewUrl, toEditableMenu, toPreviewMenu, whatsappLink, whatsappPreviewMessage } from '../src/lib/menuDrafts.ts';

const venue = {
  id: 'sample', slug: 'sample', name: 'مطعم الاختبار', nameEn: 'Test Venue',
  logoUrl: 'https://example.com/logo.webp', primaryColor: '#ffb300',
  secondaryColor: '#ffffff', currency: 'ر.ي', type: 'restaurant',
  isActive: true, statusText: 'جاهز', stitchDesignCode: '<!doctype html><html><head></head><body></body></html>',
  categories: [{ id: 'meals', labelAr: 'الوجبات' }],
  products: [{ id: 'dish-1', categoryId: 'meals', nameAr: 'أرز', descriptionAr: '', price: 1000, imageUrl: '', badge: undefined }],
  contact: { phone: '+967771234567' },
  client: { name: 'المالك', phone: '+967777000000', location: 'خاص' },
  businessInfo: 'ملاحظات داخلية خاصة',
  analytics: { qr: 1, social: 3, direct: 2 }
};

describe('private drafts and safe customer previews', () => {
  test('keeps editable menu data separate from customer CRM and analytics', () => {
    const draft = toEditableMenu(venue);
    expect(draft.name).toBe('مطعم الاختبار');
    expect(draft.products[0].price).toBe(1000);
    expect(draft.products[0]).not.toHaveProperty('badge');
    expect(draft).not.toHaveProperty('client');
    expect(draft).not.toHaveProperty('businessInfo');
    expect(draft).not.toHaveProperty('analytics');
  });

  test('client preview contains public branding, menu products and contact, not owner details', () => {
    const preview = toPreviewMenu(venue);
    expect(preview.restaurant.name).toBe('مطعم الاختبار');
    expect(preview.categories).toHaveLength(1);
    expect(preview.products[0].price).toBe(1000);
    expect(JSON.stringify(preview)).not.toContain('المالك');
    expect(JSON.stringify(preview)).not.toContain('ملاحظات داخلية');
    expect(JSON.stringify(preview)).not.toContain('777000000');
  });

  test('generates unique preview query on a configured HTTPS domain', () => {
    expect(makePreviewUrl('https://menus.example.com/path?old=yes', 'ABCdef0123456789')).toBe('https://menus.example.com/path?preview=ABCdef0123456789');
    expect(() => makePreviewUrl('', 'abc')).toThrow();
    expect(() => makePreviewUrl('http://menus.example.com', 'abc')).toThrow();
    expect(() => makePreviewUrl('https://aistudio.google.com', 'abc')).toThrow();
    expect(() => makePreviewUrl('https://localhost:3000', 'abc')).toThrow();
  });

  test('WhatsApp message is editable text with automatic link and uses a click-to-chat URL', () => {
    const link = 'https://menus.example.com/?preview=123';
    const msg = whatsappPreviewMessage('مطعم الاختبار', link, 'أحمد');
    expect(msg).toContain(link);
    expect(msg).toContain('أحمد');
    const wa = whatsappLink('+967 771 234 567', msg);
    expect(wa).toStartWith('https://wa.me/967771234567?text=');
    expect(decodeURIComponent(wa.split('text=')[1])).toBe(msg);
    expect(() => whatsappLink('abc', msg)).toThrow();
  });
});
