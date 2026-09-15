function getFirebaseAdmin() {
  // Load inside the request so dependency/runtime errors are returned as JSON
  // instead of killing the Vercel function during module initialization.
  const { cert, getApps, initializeApp } = require("firebase-admin/app");
  const { getAuth } = require("firebase-admin/auth");
  const { getDatabase } = require("firebase-admin/database");
  const { getMessaging } = require("firebase-admin/messaging");

  return {
    cert,
    getApps,
    initializeApp,
    getAuth,
    getDatabase,
    getMessaging
  };
}

function getAdminApp() {
  const { cert, getApps, initializeApp } = getFirebaseAdmin();

  // Reuse the already initialized Firebase Admin app.
  if (getApps().length) {
    return getApps()[0];
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const databaseURL = process.env.FIREBASE_DATABASE_URL;

  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  /*
   * Vercel environment variables can contain the private key in
   * several formats. Normalize all common formats before passing
   * it to Firebase Admin.
   */
  if (privateKey) {
    privateKey = privateKey.trim();

    // Remove accidental surrounding quotes.
    if (
      (privateKey.startsWith('"') && privateKey.endsWith('"')) ||
      (privateKey.startsWith("'") && privateKey.endsWith("'"))
    ) {
      privateKey = privateKey.slice(1, -1);
    }

    // Convert literal \n characters into real newlines.
    privateKey = privateKey.replace(/\\n/g, "\n");

    // Handle escaped carriage returns too.
    privateKey = privateKey.replace(/\\r/g, "");

    /*
     * Sometimes the entire Firebase service-account JSON is
     * accidentally placed inside FIREBASE_PRIVATE_KEY.
     *
     * If that happens, extract the actual private_key field.
     */
    if (privateKey.trim().startsWith("{")) {
      try {
        const serviceAccount = JSON.parse(privateKey);

        if (serviceAccount.private_key) {
          privateKey = serviceAccount.private_key
            .replace(/\\n/g, "\n")
            .replace(/\\r/g, "")
            .trim();
        }
      } catch (error) {
        throw new Error(
          "FIREBASE_PRIVATE_KEY contains invalid JSON."
        );
      }
    }

    privateKey = privateKey.trim();
  }

  /*
   * Make sure all required Firebase Admin variables exist.
   */
  if (!projectId) {
    throw new Error("Missing FIREBASE_PROJECT_ID");
  }

  if (!clientEmail) {
    throw new Error("Missing FIREBASE_CLIENT_EMAIL");
  }

  if (!privateKey) {
    throw new Error("Missing FIREBASE_PRIVATE_KEY");
  }

  if (!databaseURL) {
    throw new Error("Missing FIREBASE_DATABASE_URL");
  }

  /*
   * Firebase Admin expects a real PEM private key.
   */
  if (
    !privateKey.includes("-----BEGIN PRIVATE KEY-----") ||
    !privateKey.includes("-----END PRIVATE KEY-----")
  ) {
    throw new Error(
      "FIREBASE_PRIVATE_KEY is not a valid PEM private key. " +
      "It must contain BEGIN PRIVATE KEY and END PRIVATE KEY."
    );
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey
    }),
    databaseURL
  });
}

function adminServices() {
  const {
    getAuth,
    getDatabase,
    getMessaging
  } = getFirebaseAdmin();

  const app = getAdminApp();

  return {
    app,
    auth: getAuth(app),
    db: getDatabase(app),
    messaging: getMessaging(app)
  };
}

function sendJson(res, status, body) {
  return res.status(status).json(body);
}

function getBearer(req) {
  const header = req.headers?.authorization || "";

  return header.startsWith("Bearer ")
    ? header.slice(7)
    : null;
}

function hashId(value) {
  const crypto = require("crypto");

  return crypto
    .createHash("sha256")
    .update(String(value))
    .digest("hex");
}

async function sendDataMessage(messaging, fids, payload) {
  const uniqueFids = [
    ...new Set(
      (fids || [])
        .filter(Boolean)
        .map(String)
    )
  ];

  if (uniqueFids.length === 0) {
    return {
      attempted: 0,
      success: 0,
      failure: 0,
      invalidFids: []
    };
  }

  let success = 0;
  let failure = 0;

  const invalidFids = [];

  for (let i = 0; i < uniqueFids.length; i += 500) {
    const batch = uniqueFids.slice(i, i + 500);

    const settled = await Promise.allSettled(
      batch.map((fid) =>
        messaging.send({
          fid,

          data: {
            title: String(
              payload.title || "Eyob shopy"
            ),

            body: String(
              payload.body ||
              "You have a new notification."
            ),

            type: String(
              payload.type || "general"
            ),

            url: String(
              payload.url || "home.html"
            ),

            tag: String(
              payload.tag ||
              payload.type ||
              "eyob-shopy"
            )
          },

          webpush: {
            headers: {
              Urgency: "high",
              TTL: "2419200"
            }
          }
        })
      )
    );

    settled.forEach((result, index) => {
      if (result.status === "fulfilled") {
        success += 1;
        return;
      }

      failure += 1;

      const code = String(
        result.reason?.code || ""
      );

      if (
        code.includes(
          "registration-token-not-registered"
        ) ||
        code.includes(
          "invalid-registration-token"
        )
      ) {
        invalidFids.push(batch[index]);
      }

      console.error(
        "FCM send failed:",
        code,
        result.reason?.message ||
          result.reason
      );
    });
  }

  return {
    attempted: uniqueFids.length,
    success,
    failure,
    invalidFids
  };
}

module.exports = {
  adminServices,
  getBearer,
  hashId,
  sendDataMessage,
  sendJson
};