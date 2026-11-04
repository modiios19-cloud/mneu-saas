# Preview and safe rollout

## Google AI Studio
The branch defaults to **sandbox**, without production configuration or network reads/writes to Firebase. Open `?admin=true`, use the synthetic `sandbox-cafe`, and edit the menu normally. Browser storage keeps edits and history across reloads. The yellow banner identifies sandbox mode. Preview links in this mode work only in the same browser profile/origin; they are not customer-shareable cloud previews.

For a real shared staging environment, create a separate Firebase project, configure the VITE_FIREBASE_* variables and `VITE_APP_ENV=staging`, deploy the reviewed rules to that project, and set its public HTTPS URL in dashboard settings. Authentication must use the approved administrator UID from the rules. Never use production credentials for staging. The app rejects the production project unless both production mode and the explicit production flag are set.

## Automated checks
- `npm run lint` — TypeScript
- `npm test` — data contracts, draft/publish/restore and WhatsApp URL/message behavior
- `npm run test:rules` — Firestore rules and real SDK workflows in local emulators; Java 21+ required
- `npm run test:ui` — browser autosave, reload, HTML replacement, version restore, independent preview and WhatsApp interception. No messages are sent.
- `npm run build` — compiled app

## Data and migration
`restaurants/{id}` remains the complete, **administrator-only** source. Existing owner data, unknown fields and legacy content are retained. `publicMenus/{id}` is a separate allowlisted projection; nested categories, products and contact fields are allowlisted too. Visitors may GET an active menu but cannot enumerate, edit, or read private documents. Every dashboard mutation updates source and projection in one transaction. Drafts and history stay private. Preview snapshots are independent and expire after seven days.

`scripts/migrate-public-menus.ts` defaults to dry-run. It reads source records and prepares sanitized projections without deleting or modifying source records. It is idempotent and rereads each source inside a transaction when applying. Production apply is additionally gated by `--owner-approved-production`; this flag must never be used without the owner's explicit approval.

Production rollout after approval: backup/export first; apply migration while the current app remains active; deploy reviewed private-source rules and new app in a coordinated maintenance window; verify admin writes and anonymous reads. Existing public permissions remain unchanged until this approved rollout occurs. Do not deploy only the rules against the old app (it reads `restaurants` directly).

## Scope
Existing venue fields and platform branding/types/public URL are dashboard configuration. New software features still require development. Imported HTML must follow STITCH_MENU_CONTRACT.md to render dynamic product data; replacing arbitrary static HTML alone cannot make its hardcoded prices editable. Real analytics and external customer WhatsApp delivery are not enabled by these tests.
