import type { App } from "firebase-admin/app";
import type { Firestore } from "firebase-admin/firestore";
import type { Auth } from "firebase-admin/auth";
import { firebaseConfig } from "./config";

let adminApp: App | undefined;
let adminDb: Firestore | undefined;
let adminAuth: Auth | undefined;

// Only initialize if a service account key is explicitly provided to avoid CJS/ESM module conflict in Next.js Turbopack
if (typeof window === "undefined" && process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  try {
    const { getApps, initializeApp, cert } = require("firebase-admin/app");
    const { getFirestore } = require("firebase-admin/firestore");

    if (getApps().length === 0) {
      try {
        const creds = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        adminApp = initializeApp({
          credential: cert(creds),
          projectId: creds.project_id || firebaseConfig.projectId,
        });
      } catch {
        adminApp = initializeApp({
          projectId: firebaseConfig.projectId,
        });
      }
    } else {
      adminApp = getApps()[0];
    }

    if (adminApp) {
      adminDb = getFirestore(adminApp);
    }
  } catch (error) {
    if (process.env.DEBUG_FIREBASE) {
      console.warn("Firebase Admin initialization note:", error);
    }
  }
}

export { adminApp, adminDb, adminAuth };
