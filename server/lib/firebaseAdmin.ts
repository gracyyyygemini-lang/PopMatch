import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

let app: App | null = null;

function initFirebaseAdmin(): App | null {
  if (getApps().length > 0) {
    return getApps()[0]!;
  }

  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (json) {
    try {
      const parsed = JSON.parse(json) as Record<string, unknown>;
      return initializeApp({ credential: cert(parsed as Parameters<typeof cert>[0]) });
    } catch (e) {
      console.error("firebaseAdmin: invalid FIREBASE_SERVICE_ACCOUNT_JSON", e);
      return null;
    }
  }

  try {
    return initializeApp();
  } catch {
    return null;
  }
}

export function getFirebaseAdminApp(): App | null {
  if (!app) {
    app = initFirebaseAdmin();
  }
  return app;
}

export async function verifyFirebaseIdToken(idToken: string) {
  const a = getFirebaseAdminApp();
  if (!a) {
    throw new Error("Firebase Admin is not configured");
  }
  return getAuth(a).verifyIdToken(idToken);
}
