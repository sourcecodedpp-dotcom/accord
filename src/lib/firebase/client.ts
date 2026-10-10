import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { firebaseConfig } from "./config";

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;

try {
  if (typeof window !== "undefined" || getApps().length > 0) {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } else {
    // In server environment if initialized
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  }
} catch (error) {
  console.warn("Firebase client initialization warning:", error);
}

export { app, auth, db };
