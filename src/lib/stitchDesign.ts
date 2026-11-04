export interface StitchMenuData {
  restaurant: Record<string, unknown>;
  categories: unknown[];
  products: unknown[];
  offers: unknown[];
  updatedAt?: string | null;
}

export function buildStitchDocument(source: string, data: StitchMenuData): string {
  const safeData = JSON.stringify(data).replace(/</g, '\\u003c');
  const bridge = `<script>
    window.MENU_DATA = ${safeData};
    window.addEventListener('message', function (event) {
      if (event.source !== window.parent || event.data?.type !== 'MENU_DATA_UPDATE') return;
      window.MENU_DATA = event.data.payload;
      window.dispatchEvent(new CustomEvent('menu-data-update', { detail: window.MENU_DATA }));
    });

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

