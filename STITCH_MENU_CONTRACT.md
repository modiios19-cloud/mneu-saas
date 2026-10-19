# Stitch menu design handoff

The dashboard accepts a **complete, self-contained HTML document**, not a React/TSX component or a JSON theme object. The document is saved as `stitchDesignCode` on the restaurant record and shown in a sandboxed iframe.

## Required data contract

Before the design HTML runs, the public menu defines `window.MENU_DATA` with this shape:

```js
{
  restaurant: {
    id, slug, name, nameEn, logoUrl, primaryColor, secondaryColor,
    currency, type, contact, statusText
  },
  categories: [{ id, labelAr, labelEn, sublabelEn, isActive }],
  products: [{
    id, categoryId, nameAr, nameEn, descriptionAr, descriptionEn,
    price, calories, imageUrl, isPopular, isSpicy, isVegetarian,
    badge, isSoldOut
  }],
  offers: [/* products whose badge is "offer" */],
  updatedAt
}
```

The design must render the current `window.MENU_DATA` values, including empty category/product arrays. Do not bake restaurant-specific text, prices, image URLs, or logo into the markup. Those belong to the dashboard content editor. Contact links are available under `restaurant.contact` (phone, whatsapp, maps, instagram, tiktok, locationNameAr, workingHoursAr and English variants).

## Prompt to use in Stitch

> Build this restaurant menu as a complete standalone responsive HTML document with inline CSS and plain JavaScript. Do not use React, JSX, build tools, or external JavaScript packages. The page runs in a sandboxed iframe and receives all editable content through `window.MENU_DATA` before its script runs. Render the restaurant logo/name/contact, category navigation, product cards, prices, descriptions, images, sold-out state, popular/new/offer badges, and offers from that object. Never hardcode restaurant-specific content. Render safely with DOM APIs and `textContent`; treat all menu values as data. Re-render from the supplied object on page load. Use image/font URLs only for visual assets that are part of the design; the owner will provide product images and logo through the dashboard. Output the entire HTML document, not a React component.

## Storage and editing

Menu content (name, logo, categories, products, offers, prices, images and contact links) remains in the restaurant document and is edited in the visual menu editor. Replacing the Stitch HTML changes the visual layer; it does not replace the menu content. The design is size-limited to 400 KB so the combined Firestore document stays below the document-size ceiling. Large photos and font files should be hosted and referenced by URL.
