import { initializeApp } from "firebase/app";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCcXoiQi_2QHwmCHXXFiPRsA_-dk64CBS4",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "panditoo-3a351.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "panditoo-3a351",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "panditoo-3a351.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "349827823409",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:349827823409:web:bdf712220dbb02164e6210",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-SP9CLTQK5T",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export function setupRecaptcha(buttonId = "recaptcha-container") {
  if (window.recaptchaVerifier) {
    try {
      window.recaptchaVerifier.clear();
    } catch (_) {}
  }
  window.recaptchaVerifier = new RecaptchaVerifier(auth, buttonId, {
    size: "invisible",
    callback: () => {},
    "expired-callback": () => {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    },
  });
  return window.recaptchaVerifier;
}

export async function sendFirebaseOtp(phoneNumber, containerId = "recaptcha-container") {
  let formatted = String(phoneNumber || "").trim().replace(/\D/g, "");
  if (formatted.length === 10) formatted = "+91" + formatted;
  if (!formatted.startsWith("+")) formatted = "+" + formatted;

  const verifier = setupRecaptcha(containerId);
  const confirmationResult = await signInWithPhoneNumber(auth, formatted, verifier);
  window.confirmationResult = confirmationResult;
  return confirmationResult;
}
