import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDLkAtXLUmEcKs0uSU41nbL7uJxG8b_W6k",
  authDomain: "digital-menu-saas-82390.firebaseapp.com",
  projectId: "digital-menu-saas-82390",
  storageBucket: "digital-menu-saas-82390.firebasestorage.app",
  messagingSenderId: "100449218913",
  appId: "1:100449218913:web:1e6ea5ac284e7de3f09520",
  measurementId: "G-43E65F6Z83"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const isFirebaseConfigured = true;
export { app, firebaseConfig };
