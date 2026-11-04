import { expect, test } from 'bun:test';
import { upgradeSampleMenuHtml } from '../../src/lib/sandboxStore.ts';

test('upgrades the built-in demo into individually editable product name and price', () => {
  const old = '<!doctype html><html><head></head><body><h1 id="title"></h1><section id="products"></section><script>let a=document.createElement("article");a.textContent=p.nameAr+" — "+p.price;return a</script></body></html>';
  const fixed = upgradeSampleMenuHtml(old);
  expect(fixed).toContain('data-menu-edit="restaurant:name"');
  expect(fixed).toContain('product:"+p.id+":nameAr');
  expect(fixed).toContain('product:"+p.id+":price');
  expect(fixed).toContain('a.appendChild(price)');
  expect(upgradeSampleMenuHtml(fixed)).toBe(fixed);
});

test('does not overwrite or alter unrelated custom HTML designs', () => {
  const custom = '<!doctype html><html><body><h1>My original Stitch design</h1><p>15</p></body></html>';
  expect(upgradeSampleMenuHtml(custom)).toBe(custom);
});
