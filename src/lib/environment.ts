const env = import.meta.env || (typeof process !== 'undefined' ? process.env : {});
export const appEnvironment = env.VITE_APP_ENV || 'sandbox';
export const isSandbox = appEnvironment === 'sandbox';
export const isEmulator = appEnvironment === 'emulator';
export const adminUid = env.VITE_ADMIN_UID || 'VZMngh2pukhR8r2RoZpNIopt4R82';
export { env };
