/** Dry run by default. Retains every legacy source field and only adds sanitized projections. */
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { publicMenu } from '../src/lib/publicMenu';
const projectId = process.env.GCLOUD_PROJECT;
if (!projectId) throw new Error('Set GCLOUD_PROJECT explicitly');
const apply = process.argv.includes('--apply');
if (projectId === 'digital-menu-saas-82390' && apply && !process.argv.includes('--owner-approved-production')) {
  throw new Error('Production writes require explicit owner approval; no data was changed');
}
if (process.env.FIRESTORE_EMULATOR_HOST && !projectId.startsWith('demo-')) throw new Error('Use a demo project with the emulator');
initializeApp({ projectId, ...(process.env.FIRESTORE_EMULATOR_HOST ? {} : {credential:applicationDefault()}) });
const db = getFirestore();
const sources = await db.collection('restaurants').get();
for (const source of sources.docs) {
  if (apply) await db.runTransaction(async tx => {
    const fresh = await tx.get(source.ref);
    if (!fresh.exists) return;
    tx.set(db.doc(`publicMenus/${source.id}`), publicMenu(source.id, fresh.data()));
  });
}
console.log(JSON.stringify({mode:apply?'applied':'dry-run',projectId,documents:sources.size,sourceDocumentsModified:0}));
