import { env, isSandbox, isEmulator } from './environment';
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getAuth, connectAuthEmulator } from "firebase/auth";

const projectId = isSandbox || isEmulator ? 'demo-mneu-staging' : env.VITE_FIREBASE_PROJECT_ID;
if (!projectId) throw new Error('Configure a separate staging Firebase project, or use sandbox mode.');
if (projectId === 'digital-menu-saas-82390' && (env.VITE_APP_ENV !== 'production' || env.VITE_ALLOW_PRODUCTION !== 'true')) {
  throw new Error('Production Firebase is disabled in preview builds.');
}
const firebaseConfig = {
  projectId, apiKey: env.VITE_FIREBASE_API_KEY || 'sandbox-key',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
  appId: env.VITE_FIREBASE_APP_ID || 'sandbox-app'
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const auth = getAuth(app);
if (isEmulator && !getApp().options.projectId?.startsWith('demo-')) throw new Error('Emulator must use a demo project');
if (isEmulator) {
  connectFirestoreEmulator(db, env.VITE_EMULATOR_HOST || '127.0.0.1', 8080);
  connectAuthEmulator(auth, `http://${env.VITE_EMULATOR_HOST || '127.0.0.1'}:9099`, { disableWarnings: true });
}
export const isFirebaseConfigured = true;
export { app, firebaseConfig };

