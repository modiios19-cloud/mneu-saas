#!/bin/sh
set -eu
node --test tests/firestore.rules.test.mjs
VITE_APP_ENV=emulator node --import tsx --test tests/integration/firebaseWorkflow.test.ts
