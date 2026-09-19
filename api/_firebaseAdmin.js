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
  let privateKey =  "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDATzlzcT3cGsxY\nF2x/RpdiMKjkfTawdwamEubLCupV1Un6c48OQOxMlGLDzRGwpYmFJX1qLk6f+OP3\nA2Amy2dXRqMcprkgXz9K0XyW/TRcEDawRoDGJYHf1e3qbkPPWJxCUeCtopIohZ+M\nNt4HXJG8E+2Ro2l3q+NOyJkE1ObJlDn0KlhtJc3bSQ59HL7ERNCcVs3un4vpWDai\nLgcktJTr7YNO8nNKzU//PO4b20ucxaiaPNp6xGBhMnUSODec8ZsgLSBblHog+x3/\nEV1475/r1I+g6mjoan+Dttk6dtHesy5lNtsF6XXkScn7GypYpp7Ia4TlaSrk7aHq\nLbLO+j+NAgMBAAECggEAG7DctCmEb4bhUTbwPcRvpGkezKXWA+NjrvKuTmLQOtNH\nP3u3x+Tj0aQVM535895mNqifDjTESAcp5iXTiMqFoxzN/GBqbEWiwrZ28vPbP/1q\nroe8X6vDb3RpuXWuqHLZLziEemQcGR8iielVn6g96N/St8OYum1jAfNjCz3PzIse\nRhFRjft2L+HheY8/GJBlSUN6FKEiCvpRhN3H/mkrtOPsVdmvZpFmeFjaKSDgNzsz\nMosUnD3rNIIXUHRF0IyuijcmTM/XEEGGcUbPUE9CJWK6OLEr3Me2pA8Ghz6DRkYk\n4L+66iabWBRUgCG0bL4qAXQzUiM9mc72txXfADBG0QKBgQDeRsd7qRT9rkLagCGp\nF8M+M70HGb7MqCHKqlmte4KPJGPNZmIh+F/2YnLSH1uatYSMBP+xhvCkdT28Ra+4\nCdymDTv8ci/DNiLrzt7PZ5XHKr5+KrilP+UfvYtOW7lRz8yeifdcEVq9cCzQ2nCH\n4tLMEUh7UtLYxLvO0VBUBBwWvQKBgQDdfIazr5qcqgBCVyzjLiTrm51QeCKWvHA9\nBKHuDXS6I2BOoa8+WIsKZFx/nUdRB7cbVBcdlzRfRlvTm2G352HV6du3LU+xl0R/\nx5lEDXg+q5BG4P5OzI061Pv24uq1YJQTPzfvs9Kg+CB0+YPqJ3dBdJRdJsrf8xQ7\n7pAl7H4BEQKBgBYbR/gz3vtOpyT+a3XE21a5lnMBi+qA21/5FHdWazIdHt2tiy\nESk6BV1sjPnID9S1MpD/cLOKjYdKDv3ozS8epdanrKRnn/V/750FGlpin+uAaDjX\nL/yGJ3K1oKrIVft2kUlw2Gt62poy/3okTv7IwUKyrBGvD1a0bp7MgdapAoGBALFm\naE3LvT72OzbntCBSeWftQFePocSyMgPtjfWp+XCNnTnd7ws0yEkOkbf1NYYFc/gD\npnAhB+W36RzYO7CdN5OquD1Doa1Qx6DBMlV7pHAt4mWjGI3s8MHKjfX1UqDsNi4k\nWJ05nt8nXnfS0oHeEnru8VabF6vAeth2ACcgANzBAoGBALt6YyUVvagj1Uz2BIY4\n0A7zrrFzxvGUPPvsQIewwixpHNoNArgvrKfSv/9rZnqJg46jCMyBwhZts0bC0IjQ\nsXP4jZq+t+r65ODC2bB8mz8VNWOsWukTVWyq2qaiQ+j39GidV/f2QxtgR+cBkK\nKOgzltGc+0me9VkGTMM7wGwr\n-----END PRIVATE KEY-----\n";
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