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

## Copy this prompt into Stitch

Attach the restaurant's logo, colors, fonts, and visual references, then paste this prompt:

```text
Create a polished, responsive restaurant menu as one complete standalone HTML document. I will paste this HTML into my menu-management dashboard. The dashboard renders it inside a sandboxed iframe and lets me click the menu itself to edit its content. Follow the attached restaurant identity and design references closely; keep the layout, typography, colors, spacing, cards, and decorative styling as part of the design.

TECHNICAL OUTPUT
- Return the complete HTML document, including <!doctype html>, <html>, <head>, <style>, and plain JavaScript. Do not return React, JSX, a screenshot, a mockup, or explanatory text.
- Use inline CSS and plain JavaScript only. No build tools or external JavaScript packages.
- The dashboard provides window.MENU_DATA before rendering. Do not invent, hardcode, or bake in restaurant names, menu item names, prices, descriptions, contact details, or menu image URLs. Render those values from window.MENU_DATA.
- The data shape is: restaurant { id, slug, name, nameEn, logoUrl, primaryColor, secondaryColor, currency, type, contact, statusText }; categories [{ id, labelAr, labelEn, sublabelEn, isActive }]; products [{ id, categoryId, nameAr, nameEn, descriptionAr, descriptionEn, price, originalPrice, calories, imageUrl, isPopular, isSpicy, isVegetarian, badge, isSoldOut }]; offers is a list of products whose badge is "offer".
- Render an elegant empty state when categories or products are empty. Do not insert demo dishes or sample prices.

DIRECT EDITING IS REQUIRED
The owner edits text and images by clicking them in the design itself. Add a data-menu-edit attribute to every visible, data-driven text or image element. Put the marker on the actual element the owner clicks, not on a distant wrapper. Use these exact key formats:
  Restaurant name: data-menu-edit="restaurant:name"
  English restaurant name: data-menu-edit="restaurant:nameEn"
  Restaurant logo <img>: data-menu-edit="restaurant:logoUrl"
  Contact phone: data-menu-edit="contact:phone"
  Contact WhatsApp: data-menu-edit="contact:whatsapp"
  Contact address: data-menu-edit="contact:locationNameAr"
  Category Arabic name: data-menu-edit="category:<category-id>:labelAr"
  Category English name: data-menu-edit="category:<category-id>:labelEn"
  Product Arabic name: data-menu-edit="product:<product-id>:nameAr"
  Product English name: data-menu-edit="product:<product-id>:nameEn"
  Product description: data-menu-edit="product:<product-id>:descriptionAr"
  Product price: data-menu-edit="product:<product-id>:price"
  Product original price: data-menu-edit="product:<product-id>:originalPrice"
  Product calories: data-menu-edit="product:<product-id>:calories"
  Product image <img>: data-menu-edit="product:<product-id>:imageUrl"

For every category and product, use its real id from MENU_DATA in the marker. When creating elements in JavaScript, assign the key dynamically, for example: nameElement.dataset.menuEdit = 'product:' + product.id + ':nameAr'. For an image, put data-menu-edit directly on its <img>. Do not create fake IDs or use array positions. The dashboard recognizes these markers and saves direct edits to the matching restaurant, category, or product field.

LIVE DATA UPDATES
- Implement a renderMenu(data) function that builds/updates the menu from the supplied data.
- Call renderMenu(window.MENU_DATA) on initial load.
- Listen for window.addEventListener('menu-data-update', event => renderMenu(event.detail)). The dashboard sends this event after a direct edit; update the visible menu immediately without reloading the iframe.
- Preserve the same data-menu-edit keys every time you render so the owner can continue editing after updates.
- Use DOM APIs and textContent for data values. Do not insert data values with unsafe innerHTML.

Keep navigation, category selection, phone/WhatsApp links, and other menu interactions working. Use image/font URLs only for visual assets that are part of the supplied identity or design; actual restaurant logo and product photos come from MENU_DATA. Return only the full HTML source.
```

## Storage and editing

Menu content (name, logo, categories, products, offers, prices, images and contact links) remains in the restaurant document and is edited in the visual menu editor. Replacing the Stitch HTML changes the visual layer; it does not replace the menu content. The design is size-limited to 400 KB so the combined Firestore document stays below the document-size ceiling. Large photos and font files should be hosted and referenced by URL.
