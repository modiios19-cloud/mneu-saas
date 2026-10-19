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
  </script>`;
  const head = /<head[^>]*>/i;
  return head.test(source) ? source.replace(head, (match) => `${match}${bridge}`) : `${bridge}${source}`;
}
