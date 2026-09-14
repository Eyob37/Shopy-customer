/* Firebase Cloud Messaging background service worker for Eyob shopy. */
importScripts("https://www.gstatic.com/firebasejs/12.17.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.17.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDTOwgfhvWtxwPLGFWlT0oY9W66en6wiBw",
  authDomain: "eyob-shopy.firebaseapp.com",
  databaseURL: "https://eyob-shopy-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "eyob-shopy",
  storageBucket: "eyob-shopy.firebasestorage.app",
  messagingSenderId: "122311284300",
  appId: "1:122311284300:web:6ae0af663526863c2746e9",
  measurementId: "G-QQWD28CWX1"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const data = payload?.data || {};
  const title = data.title || "Eyob shopy";
  const body = data.body || "You have a new notification.";
  const url = data.url || "home.html";

  self.registration.showNotification(title, {
    body,
    icon: "Image/Icon.jpg",
    badge: "Image/Icon.jpg",
    tag: data.tag || data.type || "eyob-shopy",
    renotify: true,
    data: { url }
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification?.data?.url || "home.html";

  event.waitUntil((async () => {
    const target = new URL(url, self.location.origin).href;
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });

    for (const client of clients) {
      if ("focus" in client) {
        try {
          await client.navigate(target);
        } catch (_) {}
        return client.focus();
      }
    }

    if (self.clients.openWindow) return self.clients.openWindow(target);
  })());
});
