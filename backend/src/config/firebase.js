const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

let firebaseApp = null;

function initFirebaseAdmin() {
  if (firebaseApp) return firebaseApp;

  try {
    const serviceAccountPath = path.resolve(__dirname, "../../config/firebase-service-account.json");
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log("[FIREBASE:ADMIN] Successfully initialized Firebase Admin SDK using service account JSON");
    } else if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID || "panditoo-3a351",
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
        }),
      });
      console.log("[FIREBASE:ADMIN] Successfully initialized Firebase Admin SDK using environment variables");
    } else {
      console.warn("[FIREBASE:ADMIN] Service account JSON or environment variables not found. Firebase Admin disabled.");
    }
  } catch (error) {
    console.error("[FIREBASE:ADMIN] Initialization error:", error.message);
  }

  return firebaseApp;
}

initFirebaseAdmin();

module.exports = {
  admin,
  initFirebaseAdmin,
};
