import { describe, expect, test } from 'bun:test';
import { buildStitchDocument } from '../src/lib/stitchDesign.ts';

const template = '<!doctype html><html><head><meta charset="utf-8"></head><body><main id="menu"></main></body></html>';
const data = {
  restaurant: { id: 'cafe-01', name: 'مقهى الاختبار', primaryColor: '#c4a484' },
  categories: [{ id: 'drinks', labelAr: 'المشروبات' }],
  products: [{ id: 'tea', categoryId: 'drinks', nameAr: 'شاي', price: 120 }],
  offers: [],
  updatedAt: null,
};

describe('Stitch HTML bridge', () => {
  test('keeps the supplied custom design and inserts a data bridge in its head', () => {
    const output = buildStitchDocument(template, data);
    expect(output).toContain('<main id="menu"></main>');
    expect(output).toContain('<meta charset="utf-8">');
    expect(output).toContain('window.MENU_DATA = ');
    expect(output).toContain('MENU_DATA_UPDATE');
    expect(output).toContain('menu-data-update');
  });

  test('keeps each venue\'s categories, products and branding independent', () => {
    const output = buildStitchDocument(template, data);
    const match = output.match(/window\.MENU_DATA = (\{[^\n]+\});/);
    expect(match).not.toBeNull();
    const embeddedData = JSON.parse(match[1]);
    expect(embeddedData).toEqual(data);
    expect(embeddedData.products[0].price).toBe(120);
  });

  test('escapes HTML tag openers in menu data before embedding it in script', () => {
    const malicious = structuredClone(data);
    malicious.restaurant.name = '</script><img src=x onerror=alert(1)>';
    const output = buildStitchDocument(template, malicious);
    expect(output).not.toContain('</script><img src=x');
    expect(output).toContain('\\u003c/script>');
  });

  test('supports designs without a head element', () => {
    const source = '<div class="bespoke-menu">Special layout</div>';
    const output = buildStitchDocument(source, data);
    expect(output).toContain(source);
    expect(output).toContain('window.MENU_DATA');
  });
});
