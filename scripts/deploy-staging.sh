#!/bin/sh
set -eu
# Explicit project and config on every deployment; never consult the production default.
node scripts/build-staging.mjs
node_modules/.bin/firebase deploy --project mneu-saas-staging --config staging/firebase.json --only firestore:rules,hosting
