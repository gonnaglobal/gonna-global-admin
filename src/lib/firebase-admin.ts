import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  throw new Error("Firebase Admin credentials are missing.");
}

if (projectId !== process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
  throw new Error("Firebase projects do not match.");
}

const app =
  getApps().find((item) => item.name === "gonna-global-admin") ??
  initializeApp(
    { credential: cert({ projectId, clientEmail, privateKey }) },
    "gonna-global-admin"
  );

export const adminDb = getFirestore(app);
export { FieldValue };
