import ganjiLogo from '../assets/ganji-logo.webp?inline';

/** Shared design credit; the logo is embedded, so no third-party image request is needed. */
export function GanjiCredit() {
  return <div dir="rtl" className="w-full pt-4 text-center">
    <a href="https://ganji-studio.com/" target="_blank" rel="noopener noreferrer" className="inline-flex flex-wrap items-center justify-center gap-2 text-xs text-zinc-600 no-underline hover:text-zinc-900" aria-label="تم تصميم هذا المنيو بواسطة شركة جانجي | Ganji — زيارة الموقع">
      <img src={ganjiLogo} width="25" height="25" alt="" className="h-[25px] w-[25px] rounded-md object-cover"/>
      <span>تم تصميم هذا المنيو بواسطة شركة <strong>جانجي | <span dir="ltr">Ganji</span></strong></span>
    </a>
  </div>;
}
