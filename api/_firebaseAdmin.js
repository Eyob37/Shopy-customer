function getFirebaseAdmin() {
  // Load inside the request so dependency/runtime errors are returned as JSON
  // instead of killing the Vercel function during module initialization.
  const { cert, getApps, initializeApp } = require("firebase-admin/app");
  const { getAuth } = require("firebase-admin/auth");
  const { getDatabase } = require("firebase-admin/database");
  const { getMessaging } = require("firebase-admin/messaging");
  return { cert, getApps, initializeApp, getAuth, getDatabase, getMessaging };
}

function getAdminApp() {
  const { cert, getApps, initializeApp } = getFirebaseAdmin();
  if (getApps().length) return getApps()[0];

  const projectId = "eyob-shopy";
  const clientEmail = "firebase-adminsdk-fbsvc@eyob-shopy.iam.gserviceaccount.com";
  let privateKey =  "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDB2rUVLyKRTPsU\n50BpgJJPD4W4Rdy5eHWge5MXBJNA+XUVqFAjAxs8yuTtymXtVrmIzhDnzHyU2goM\nf4UiJZTEzQEV/ajFnUgeh1m6ur7XEVk/21OetZ+cvgezuX/YL0xX5KI3g9H28p3r\nTzlrMxbWRAYkTgPq3BVbssWQvJev5yL+pZ2GAjBdAGY0qZKKM3z3n4+XcsOhMWsc\nNgkKExkIDuMqb7RsY9nAMlX5UirGxA05AutA7SbYHD322KHTBBjI45tbYaosCHS1\nwTji8cnJiqgjrZWL+9GPvOwihMQM/3d/LhhB52kf7HlJ8ZOhZFz5CXpyByz0Dybj\nbFqSDXpdAgMBAAECggEAEJAeu7Ygxnhk1YbipoEBPzcMzk9Nyh0EM9eLHELcUAdg\nXR7Z5fvsdlfBkp2h8tLfnFQ69osus8sjY6j7l4zNdrkrWBUpt+S11kHrRTySdK67\nSOz06pELF6nW36DATxjPdY0H3SVqqaZWHtZQihu93kXGnpB53jW6r3CJV9H9Rd6b\n42EtAjifBk9DjC3HpyoE30IVX4p8wTV+FwyMFnyRf5VNxeWKxAxzSLTHmj+AWUcG\nEtOB5Dwjs8rP+8ULRd6Ji/bGSNpa+xPwU1UcN5HJMAQRKgvOqatM6YsAtzog2OLL\nA9D964Hgq+5SPJdw36daM8SqX08aKmM3kD6qTHsVswKBgQD+hE6OeYufNpYC93eW\neANWuagrO+/OvnQ7sHLf4BePw1nxwD2izdn54rUV5TO+F3LL/4cqJuTTEZW+pgEK\np8p/n5SVjo02YwQRK2B/AUDdrXMtATGU9RGUzuOkCSY9Ee3H/1F7LjgpjU9TLQUa\n/medxP/lIVAywU0hSSA8vfp56wKBgQDC++crDk8OGf1mzsU6dNFOEqxRA03o5gT4\n5l9rf/LlaCXIU+S6kT9cdqSTrGEN/UXmjIzMG9ZEvL2wjPvAdNz0L8NdUnVR6TTg\nqMiStzIcVC0wYUelLT0ZH31aYD1momRTdqBYkWV/FZMPcM8NlTFgFKhnBs/q+Xpo\nA2S2BKfC1wKBgHgsQGtFOIeUXoBIGE8Tm3/3aVAAnNohUwBb7+GFDZrzwiRDgNa+\nG43BXX9ZGXVH3Qw1OrzMYH7Ibsv11cgSMarQzndPN53WYrU4pfdRwC7rFtbJGYAb\ntpFsnk91gniTXpJwGyjuSdZUwn+jYiW8uW/k9G5brGJKowB0ZqRHj1zBAoGAU3l2\ngQdSLu5Pfuj8pMcIKE10OgaZHyECdfBiX2paeX351uaboIe4QYSFdrcwocWRXF9F\nk8hDFhBbgS8KRF2DjoK4N8aqdVPKkHeRzsXhDSG4auLqwjs40f2aM8vJ3ZueKeE6\nSlCMzDhXSh/4dI8voTuW0OyorKb7kXYKcqZRj+cCgYEAt1a6O4q9la5Vgayne+4N\nzQ8C+M+5CkPjR03cHcU4Ix3zabM8eY0jWVvFRgLsKTKGxehdNsYc/RNK1ULiQZ+A\nvT2Och6CoeDgMLHqegFjDYp1/uWsDiicBUi9rC4CtakrSzBOJQAmjjtc656BVA75\nHIoiYRM+4p7JZvRnA17P2IQ=\n-----END PRIVATE KEY-----\n";
  const databaseURL = "https://eyob-shopy-default-rtdb.europe-west1.firebasedatabase.app/";

  privateKey = privateKey.replace(/^['"]|['"]$/g, "").replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey || !databaseURL) {
    throw new Error("Missing Firebase Admin environment variables: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, FIREBASE_DATABASE_URL");
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    databaseURL
  });
}

function adminServices() {
  const { getAuth, getDatabase, getMessaging } = getFirebaseAdmin();
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
  return header.startsWith("Bearer ") ? header.slice(7) : null;
}

function hashId(value) {
  const crypto = require("crypto");
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

async function sendDataMessage(messaging, fids, payload) {
  const uniqueFids = [...new Set((fids || []).filter(Boolean).map(String))];
  if (uniqueFids.length === 0) return { attempted: 0, success: 0, failure: 0, invalidFids: [] };

  let success = 0;
  let failure = 0;
  const invalidFids = [];

  for (let i = 0; i < uniqueFids.length; i += 500) {
    const batch = uniqueFids.slice(i, i + 500);
    const settled = await Promise.allSettled(batch.map((fid) => messaging.send({
      fid,
      data: {
        title: String(payload.title || "Adey Bonda"),
        body: String(payload.body || "You have a new notification."),
        type: String(payload.type || "general"),
        url: String(payload.url || "home.html"),
        tag: String(payload.tag || payload.type || "adey-bonda")
      },
      webpush: {
        headers: { Urgency: "high", TTL: "2419200" }
      }
    })));

    settled.forEach((result, index) => {
      if (result.status === "fulfilled") {
        success += 1;
        return;
      }
      failure += 1;
      const code = String(result.reason?.code || "");
      if (code.includes("registration-token-not-registered") || code.includes("invalid-registration-token")) {
        invalidFids.push(batch[index]);
      }
      console.error("FCM send failed:", code, result.reason?.message || result.reason);
    });
  }

  return { attempted: uniqueFids.length, success, failure, invalidFids };
}

module.exports = { adminServices, getBearer, hashId, sendDataMessage, sendJson };