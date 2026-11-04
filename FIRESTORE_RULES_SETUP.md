# Firestore security rollout — not deployed

Do not paste or deploy these rules to production without owner approval and a coordinated application rollout.

The staging branch reads anonymous menus from `publicMenus/{id}`. Existing `restaurants/{id}` documents become administrator-only and retain all original owner/client data. Drafts, version history, settings and reports are private. Client preview snapshots support GET by unguessable token until expiry; anonymous listing and all anonymous writes are denied.

Use `npm run test:rules` with Java 21+ to test the actual rules and SDK workflows against `demo-mneu-staging` local emulators. No production credentials are needed.

For a real separate staging project, configure VITE_APP_ENV=staging and its VITE_FIREBASE_* variables. The authorized administrative UID must match the reviewed rules. Keep production credentials out of staging.

`scripts/migrate-public-menus.ts` prepares public projections from existing records and defaults to dry-run. It never deletes or changes the original source records. Do not execute its production apply flag without explicit approval.

See STAGING.md for the backup, migration, rules and application rollout order. Deploying only the new rules while the old app still reads `restaurants` will interrupt the old public menus.
