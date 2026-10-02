import { getApp, getApps, initializeApp } from "firebase/app";
import { GoogleAuthProvider, getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import appletConfig from "@/firebase-applet-config.json";

const config = {
  apiKey: appletConfig.apiKey || process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: appletConfig.authDomain || process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: appletConfig.projectId || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: appletConfig.storageBucket || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: appletConfig.messagingSenderId || process.env.NEXT_PUBLIC_FIREBASE_MSG_SENDER_ID,
  appId: appletConfig.appId || process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  firestoreDatabaseId: appletConfig.firestoreDatabaseId || process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_DATABASE_ID,
};

export const firebaseConfigured = Boolean(config.apiKey && config.projectId && config.appId);

export const firebaseApp = firebaseConfigured
  ? (getApps().length ? getApp() : initializeApp(config))
  : null;

export const auth = firebaseApp ? getAuth(firebaseApp) : null;
export const db = firebaseApp
  ? (config.firestoreDatabaseId ? getFirestore(firebaseApp, config.firestoreDatabaseId) : getFirestore(firebaseApp))
  : null;

export const googleProvider = firebaseApp ? new GoogleAuthProvider() : null;
if (googleProvider) {
  googleProvider.setCustomParameters({ prompt: "select_account" });
}
