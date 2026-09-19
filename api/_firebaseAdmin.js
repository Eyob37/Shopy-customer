function getFirebaseAdmin() {
  // Load Firebase Admin inside the request so initialization
  // errors can be returned normally by the Vercel function.
  const {
    cert,
    getApps,
    initializeApp
  } = require("firebase-admin/app");

  const {
    getAuth
  } = require("firebase-admin/auth");

  const {
    getDatabase
  } = require("firebase-admin/database");

  const {
    getMessaging
  } = require("firebase-admin/messaging");

  return {
    cert,
    getApps,
    initializeApp,
    getAuth,
    getDatabase,
    getMessaging
  };
}


/**
 * Get or initialize Firebase Admin.
 */
function getAdminApp() {
  const {
    cert,
    getApps,
    initializeApp
  } = getFirebaseAdmin();

  // Reuse existing Firebase Admin app.
  if (getApps().length > 0) {
    return getApps()[0];
  }

  /*
   * IMPORTANT:
   * These values now come from Vercel Environment Variables.
   */
  const projectId =
    process.env.FIREBASE_PROJECT_ID;

  const clientEmail =
    process.env.FIREBASE_CLIENT_EMAIL;

  const databaseURL =
    process.env.FIREBASE_DATABASE_URL;

  let privateKey =
    process.env.FIREBASE_PRIVATE_KEY;


  /*
   * Check that the environment variables exist.
   */
  if (!projectId) {
    throw new Error(
      "Missing FIREBASE_PROJECT_ID"
    );
  }

  if (!clientEmail) {
    throw new Error(
      "Missing FIREBASE_CLIENT_EMAIL"
    );
  }

  if (!privateKey) {
    throw new Error(
      "Missing FIREBASE_PRIVATE_KEY"
    );
  }

  if (!databaseURL) {
    throw new Error(
      "Missing FIREBASE_DATABASE_URL"
    );
  }


  /*
   * Convert the environment variable to a string.
   */
  privateKey = String(privateKey).trim();


  /*
   * Remove accidental surrounding quotes.
   *
   * Example:
   * "-----BEGIN PRIVATE KEY-----..."
   */
  if (
    (privateKey.startsWith('"') &&
      privateKey.endsWith('"')) ||
    (privateKey.startsWith("'") &&
      privateKey.endsWith("'"))
  ) {
    privateKey =
      privateKey.slice(1, -1);
  }


  /*
   * Vercel can contain the key as:
   *
   * -----BEGIN PRIVATE KEY-----\nABC...\n-----END PRIVATE KEY-----
   *
   * Firebase needs actual newline characters.
   */
  privateKey = privateKey
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");


  /*
   * Sometimes people accidentally put the entire
   * Firebase service-account JSON inside
   * FIREBASE_PRIVATE_KEY.
   *
   * If that happens, extract only private_key.
   */
  if (
    privateKey.trim().startsWith("{")
  ) {
    try {
      const serviceAccount =
        JSON.parse(privateKey);

      if (!serviceAccount.private_key) {
        throw new Error(
          "private_key was not found"
        );
      }

      privateKey =
        String(serviceAccount.private_key)
          .replace(/\\r\\n/g, "\n")
          .replace(/\\n/g, "\n")
          .replace(/\r\n/g, "\n")
          .replace(/\r/g, "\n")
          .trim();

    } catch (error) {
      throw new Error(
        "FIREBASE_PRIVATE_KEY contains invalid service-account JSON."
      );
    }
  }


  /*
   * Final cleanup.
   */
  privateKey = privateKey.trim();


  /*
   * Make sure it really looks like a PEM
   * Firebase private key.
   */
  if (
    !privateKey.includes(
      "-----BEGIN PRIVATE KEY-----"
    ) ||
    !privateKey.includes(
      "-----END PRIVATE KEY-----"
    )
  ) {
    throw new Error(
      "FIREBASE_PRIVATE_KEY is not a valid PEM private key. " +
      "It must contain -----BEGIN PRIVATE KEY----- " +
      "and -----END PRIVATE KEY-----."
    );
  }


  /*
   * Initialize Firebase Admin.
   */
  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey
    }),

    databaseURL
  });
}


/**
 * Firebase Admin services.
 */
function adminServices() {
  const {
    getAuth,
    getDatabase,
    getMessaging
  } = getFirebaseAdmin();

  const app =
    getAdminApp();

  return {
    app,
    auth: getAuth(app),
    db: getDatabase(app),
    messaging: getMessaging(app)
  };
}


/**
 * Send JSON response.
 */
function sendJson(
  res,
  status,
  body
) {
  return res
    .status(status)
    .json(body);
}


/**
 * Get Bearer token.
 */
function getBearer(req) {
  const header =
    req.headers?.authorization || "";

  return header.startsWith("Bearer ")
    ? header.slice(7)
    : null;
}


/**
 * Create SHA-256 hash.
 */
function hashId(value) {
  const crypto =
    require("crypto");

  return crypto
    .createHash("sha256")
    .update(String(value))
    .digest("hex");
}


/**
 * Send FCM data messages.
 */
async function sendDataMessage(
  messaging,
  fids,
  payload
) {
  const uniqueFids = [
    ...new Set(
      (fids || [])
        .filter(Boolean)
        .map(String)
    )
  ];

  if (
    uniqueFids.length === 0
  ) {
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


  /*
   * FCM supports batches up to 500 tokens.
   */
  for (
    let i = 0;
    i < uniqueFids.length;
    i += 500
  ) {
    const batch =
      uniqueFids.slice(
        i,
        i + 500
      );


    const settled =
      await Promise.allSettled(
        batch.map((fid) =>
          messaging.send({
            fid,

            data: {
              title: String(
                payload.title ||
                  "Eyob shopy"
              ),

              body: String(
                payload.body ||
                  "You have a new notification."
              ),

              type: String(
                payload.type ||
                  "general"
              ),

              url: String(
                payload.url ||
                  "home.html"
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


    settled.forEach(
      (result, index) => {

        if (
          result.status ===
          "fulfilled"
        ) {
          success += 1;
          return;
        }


        failure += 1;

        const code =
          String(
            result.reason?.code ||
              ""
          );


        if (
          code.includes(
            "registration-token-not-registered"
          ) ||
          code.includes(
            "invalid-registration-token"
          )
        ) {
          invalidFids.push(
            batch[index]
          );
        }


        console.error(
          "FCM send failed:",
          code,
          result.reason?.message ||
            result.reason
        );
      }
    );
  }


  return {
    attempted:
      uniqueFids.length,

    success,

    failure,

    invalidFids
  };
}


/**
 * Export functions.
 */
module.exports = {
  adminServices,
  getBearer,
  hashId,
  sendDataMessage,
  sendJson
};