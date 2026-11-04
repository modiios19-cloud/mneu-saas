# mneu-saas — approved product behavior

## Product ownership and business model
- One platform administrator manages all restaurant and cafe menus.
- Every venue uses an independent custom **Stitch HTML** design, not a forced catalog of templates.
- The admin pastes or replaces the complete HTML document through the dashboard.
- Menu data (stable venue IDs, categories, stable product IDs, names, prices, descriptions, images and links) stays independent of HTML.
- Daily management and branding/config changes must be editable through the admin UI and persisted to Firebase without code changes.
- Developing **new software features** still requires code; changing venue content/configurations must not.

## Editing, drafts, approval and client previews
1. The admin can create a new venue; it starts inactive.
2. Every editor change is autosaved to an admin-only `menuDrafts/{venueId}` record after a debounce.
3. Customers continue to see only the last published `restaurants/{venueId}` version.
4. A menu preview is a short-lived read-only snapshot in `menuPreviews/{unguessableToken}`, not the live menu.
5. The dashboard generates a customer preview link from the admin-configured public HTTPS origin, not an internal AI Studio preview URL.
6. A WhatsApp draft message includes the preview link automatically; the admin can edit the phone and message and then open the client's chat. The human must press Send in WhatsApp.
7. Publishing archives the old live menu in admin-only `menuVersions/{venueId}/versions/{versionId}`, then publishes the new data in a single Firestore write batch.
8. Restore an archived version **to the draft** first; do not immediately overwrite the live customer menu.
9. Use Firestore Rules and authentication to separate private clients/CRM records from public menu data **before production**.

## QR and later expansion
- **v1:** One ordinary QR code per restaurant/cafe; design the printed QR display externally for each venue.
- **Later:** Table-specific codes should identify immutable `venueId` + opaque `tableId` (do not trust browser-supplied prices).
- **Later:** Customer ordering, order routing, cashier/POS, kitchen screens, waiter handoff and billing live in independent backend collections/services.
- Preserve stable venue/product IDs as the compatibility contract for future orders.
- The Stitch design stays a presentation layer, not the trusted payment/order authority.

## Current release blockers
- Published Firestore Rules currently block all writes, even the administrator; code changes alone do not change live rules.
- `restaurants` currently mixes public menu data with customer-management details. Public access must be safely migrated to a sanitized collection; never claim that field hiding in React protects Firestore data.
- Real customer sharing requires a deployed public HTTPS URL. AI Studio preview is suitable for internal review only.
- The editor/version/WhatsApp workflow needs a real Firebase staging integration test.
- Any new security rules or production deployment require explicit owner approval.
- Do not represent fabricated analytics as genuine visitor activity.
