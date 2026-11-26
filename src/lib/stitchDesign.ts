import { getContactLinks } from './contactLinks';
import ganjiLogo from '../assets/ganji-logo.webp?inline';
import type { RestaurantContact } from '../types/restaurant';

export interface StitchMenuData {
  restaurant: Record<string, unknown>;
  categories: unknown[];
  menuGroups?: unknown[];
  products: unknown[];
  offers: unknown[];
  updatedAt?: string | null;
}

/** Prepare validated contact URLs before sending data into the sandboxed document. */
export function withPlatformContactLinks(data: StitchMenuData) {
  return { ...data, platformContactLinks: getContactLinks((data.restaurant.contact || {}) as RestaurantContact) };
}

export function buildStitchDocument(source: string, data: StitchMenuData): string {
  const safeData = JSON.stringify(withPlatformContactLinks(data)).replace(/</g, '\\u003c');
  const bridge = `<script>
    window.MENU_DATA = ${safeData};
    window.addEventListener('message', function (event) {
      if (event.source !== window.parent || event.data?.type !== 'MENU_DATA_UPDATE') return;
      window.MENU_DATA = event.data.payload;
      window.dispatchEvent(new CustomEvent('menu-data-update', { detail: window.MENU_DATA }));
    });

    // Platform contact links follow the design in the same scrolling document.
    (function installContactFooter() {
      var icons = {
        phone:'<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.2 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72l.28 2.2a2 2 0 0 1-.57 1.7L7.55 8.87a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 1.7-.57l2.2.28A2 2 0 0 1 22 16.92z"/>',
        whatsapp:'<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 8.4 8.4 0 0 1-4-1L3 21l2-5.5a8.5 8.5 0 1 1 16-4z"/><path d="M9 8c.5 3 2 4.5 5 5"/>',
        maps:'<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="2.5"/>',
        instagram:'<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".7" fill="currentColor" stroke="none"/>',
        facebook:'<path d="M15 21v-8h3l.5-4H15V7c0-1 .5-2 2-2h1.5V2.2A18 18 0 0 0 16 2c-3 0-5 1.8-5 5v2H8v4h3v8z"/>',
        tiktok:'<path d="M14 3v12a4 4 0 1 1-4-4c.4 0 .7 0 1 .1v3a1.5 1.5 0 1 0 .5 1.1V3h2.5c.3 2.7 1.8 4.2 4.5 4.5V10A7 7 0 0 1 14 8z"/>'
      };
      var nav, credit;
      function draw(data) {
        if (!document.body) return;
        if (!nav) {
          nav = document.createElement('nav'); nav.setAttribute('aria-label','روابط التواصل'); nav.setAttribute('dir','rtl');
          nav.style.cssText = 'display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:8px;padding:18px 12px;background:#fff;font-family:Tahoma,Arial,sans-serif;';
        }
        nav.replaceChildren();
        var color = data && data.restaurant && data.restaurant.primaryColor || '#A33900';
        if (!window.CSS || !CSS.supports('color', color)) color = '#A33900';
        nav.style.borderTop = '2px solid ' + color;
        (data && data.platformContactLinks || []).forEach(function(link) {
          if (!icons[link.kind]) return;
          var a = document.createElement('a'); a.href = link.href; a.setAttribute('aria-label',link.label);
          if (link.kind !== 'phone') { a.target='_blank'; a.rel='noopener noreferrer'; }
          a.style.cssText = 'display:inline-flex;align-items:center;gap:6px;border:1px solid #e4e4e7;border-radius:999px;padding:9px 12px;color:#18181b;text-decoration:none;font-size:12px;font-weight:bold;background:#fff;';
          var svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
          svg.setAttribute('viewBox','0 0 24 24'); svg.setAttribute('width','17'); svg.setAttribute('height','17'); svg.setAttribute('fill','none'); svg.setAttribute('stroke','currentColor'); svg.setAttribute('stroke-width','2'); svg.setAttribute('stroke-linecap','round'); svg.setAttribute('stroke-linejoin','round'); svg.style.color=color; svg.innerHTML=icons[link.kind];
          var label=document.createElement('span'); label.textContent=link.label; a.append(svg,label); nav.appendChild(a);
        });
        if (nav.children.length) document.body.appendChild(nav); else nav.remove();
        if (!credit) {
          credit = document.createElement('div'); credit.setAttribute('dir','rtl'); credit.setAttribute('data-ganji-credit','');
          credit.style.cssText = 'display:flex;justify-content:center;padding:14px 12px 18px;background:#fff;font-family:Tahoma,Arial,sans-serif;';
          var link = document.createElement('a'); link.href='https://ganji-studio.com/'; link.target='_blank'; link.rel='noopener noreferrer'; link.setAttribute('aria-label','تم تصميم هذا المنيو بواسطة شركة جانجي | Ganji — زيارة الموقع');
          link.style.cssText='display:inline-flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:8px;color:#52525b;text-decoration:none;font-size:12px;line-height:1.6;';
          var logo = document.createElement('img'); logo.src=${JSON.stringify(ganjiLogo)}; logo.alt=''; logo.width=25; logo.height=25; logo.style.cssText='width:25px;height:25px;object-fit:cover;border-radius:6px;';
          var words = document.createElement('span'); words.textContent='تم تصميم هذا المنيو بواسطة شركة جانجي | Ganji'; link.append(logo,words); credit.appendChild(link);
        }
        document.body.appendChild(credit);
      }
      document.addEventListener('DOMContentLoaded', function(){ draw(window.MENU_DATA); });
      window.addEventListener('menu-data-update', function(e){ draw(e.detail); });
    })();

    // Elements marked with data-menu-edit become editable directly in the design.
    // Binding keys are persisted by the dashboard, so the data-driven design stays in sync.
    (function installInlineEditor() {
      var active = false;
      var style = document.createElement('style');
      style.textContent = '[data-menu-edit]{cursor:pointer;outline:transparent dashed 1px;outline-offset:3px}[data-menu-edit]:hover{outline-color:#a33900}[data-menu-edit][contenteditable="true"]{outline:2px solid #a33900;background:rgba(255,255,255,.88);color:#111}';
      document.head.appendChild(style);

      window.addEventListener('message', function (event) {
        if (event.source === window.parent && event.data?.type === 'MENU_EDITOR_MODE') active = !!event.data.enabled;
      });

      document.addEventListener('click', function (event) {
        if (!active) return;
        var target = event.target.closest('[data-menu-edit]');
        if (!target) return;
        var key = target.getAttribute('data-menu-edit');
        if (!key) return;
        event.preventDefault();
        event.stopPropagation();
        if (target.tagName === 'IMG' || target.getAttribute('data-menu-edit-type') === 'image') {
          window.parent.postMessage({ type: 'MENU_INLINE_IMAGE_EDIT', key: key, value: target.getAttribute('src') || '' }, '*');
          return;
        }
        target.setAttribute('contenteditable', 'true');
        target.focus();
        var finish = function () {
          target.removeAttribute('contenteditable');
          target.removeEventListener('blur', finish);
          window.parent.postMessage({ type: 'MENU_INLINE_TEXT_EDIT', key: key, value: target.innerText.trim() }, '*');
        };
        target.addEventListener('blur', finish);
      }, true);
    })();
  </script>`;
  const head = /<head[^>]*>/i;
  return head.test(source) ? source.replace(head, (match) => `${match}${bridge}`) : `${bridge}${source}`;
}
