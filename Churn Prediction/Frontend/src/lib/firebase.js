// If the VITE_FIREBASE_* env vars aren't set, Firebase auth stays disabled
// and the Login page does not initialize Firebase at startup.
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, RecaptchaVerifier, signInWithPhoneNumber, signInWithPopup } from 'firebase/auth';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

export const isFirebaseConfigured = Boolean(config.apiKey && config.projectId && config.appId);

let app = null;
if (isFirebaseConfigured) {
  app = initializeApp(config);
}

export async function signInWithGoogle() {
  if (!app) throw new Error('Google sign-in is not configured');
  const auth = getAuth(app);
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return result.user.getIdToken();
}

export function createPhoneVerifier() {
  if (!app) throw new Error('Firebase sign-in is not configured');
  return new RecaptchaVerifier(getAuth(app), 'recaptcha-container', { size: 'invisible' });
}

export async function sendPhoneOtp(phoneNumber, verifier) {
  if (!app) throw new Error('Firebase sign-in is not configured');
  return signInWithPhoneNumber(getAuth(app), phoneNumber, verifier);
}
