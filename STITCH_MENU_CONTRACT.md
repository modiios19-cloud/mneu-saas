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

The design must render the current `window.MENU_DATA` values, including empty category/product arrays. Do not bake restaurant-specific text, prices, image URLs, or logo into the markup. Contact links are available under `restaurant.contact` (phone, whatsapp, maps, instagram, tiktok, locationNameAr, workingHoursAr and English variants). Listen for `menu-data-update` and re-render without reloading. In the dashboard, the Stitch design itself is the editor: the owner clicks a marked text or image in the design and edits it in place.

## Direct editing markers

Add `data-menu-edit` to each text or image element that should be editable. Use these keys:

| Element | Key |
| --- | --- |
| Restaurant name | `restaurant:name` |
| Restaurant English name | `restaurant:nameEn` |
| Logo image | `restaurant:logoUrl` |
| Contact field, such as phone | `contact:phone` |
| Category label | `category:<category-id>:labelAr` |
| Product name | `product:<product-id>:nameAr` |
| Product description | `product:<product-id>:descriptionAr` |
| Product price | `product:<product-id>:price` |
| Product image | `product:<product-id>:imageUrl` |

For text, put the marker on the element that displays the data. For images, put it directly on the `<img>`. The dashboard enables in-place editing in the iframe and saves edits into the corresponding menu data field. Continue rendering values from `window.MENU_DATA`, and listen for `menu-data-update` to reflect edits immediately.

## Prompt to use in Stitch

> Build this restaurant menu as a complete standalone responsive HTML document with inline CSS and plain JavaScript. Do not use React, JSX, build tools, or external JavaScript packages. The page runs in a sandboxed iframe and receives all editable content through `window.MENU_DATA` before its script runs. Render the restaurant logo/name/contact, category navigation, product cards, prices, descriptions, images, sold-out state, popular/new/offer badges, and offers from that object. Never hardcode restaurant-specific content. Render safely with DOM APIs and `textContent`; treat all menu values as data. Add `data-menu-edit` to every data-driven value so the owner can click and edit it directly in the dashboard design: use `restaurant:name`, `restaurant:logoUrl`, `contact:phone`, `category:<id>:labelAr`, `product:<id>:nameAr`, `product:<id>:descriptionAr`, `product:<id>:price`, and `product:<id>:imageUrl`. Listen for `window.addEventListener('menu-data-update', event => renderMenu(event.detail))` so edits update instantly without a page reload. Use image/font URLs only for design assets; the owner will provide product images and logo through the dashboard. Output the entire HTML document, not a React component.

## Storage and editing

Menu content (name, logo, categories, products, offers, prices, images and contact links) remains in the restaurant document and is edited in the visual menu editor. Replacing the Stitch HTML changes the visual layer; it does not replace the menu content. The design is size-limited to 400 KB so the combined Firestore document stays below the document-size ceiling. Large photos and font files should be hosted and referenced by URL.
