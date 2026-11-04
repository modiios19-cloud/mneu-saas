# Real staging setup

Firebase project: `mneu-saas-staging` (Spark).
Firestore: `(default)`, Standard, `me-central1`, created with deny-all rules.
Registered web app: `Mneu Staging Web`.
Email/Password sign-in: enabled. No production user or restaurant records copied.
Hosting site: `mneu-saas-staging`; web app registered, no release deployed yet.

Deployment is pending owner approval of the Firebase CLI OAuth consent shown in the connected browser. CLI requests account-wide Firebase/Cloud permissions even though every deployment script is explicitly scoped to staging.

After authorization: provision a synthetic administrator in this test project, set STAGING_ADMIN_UID to that account's actual UID, build and deploy with scripts/deploy-staging.sh. This generates separate rules and a staging-only build. Do not deploy the root production rules as-is and do not enable public write access.

Acceptance tests still to run on the live staging service: venue/product creation, price/image changes, reload persistence, full HTML replacement, archive/restore as draft, settings edits, tokenized preview from another session, WhatsApp editable message. Earlier local/emulator tests are not a substitute for these real staging checks.
