/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js');

function getFirebaseConfigFromSw() {
  try {
    var params = new URL(self.location.href).searchParams;
    var apiKey = params.get('apiKey');
    var projectId = params.get('projectId');
    var messagingSenderId = params.get('messagingSenderId');
    var appId = params.get('appId');
    if (apiKey && projectId && messagingSenderId && appId) {
      return {
        apiKey: apiKey,
        authDomain: params.get('authDomain') || projectId + '.firebaseapp.com',
        projectId: projectId,
        storageBucket: params.get('storageBucket') || projectId + '.firebasestorage.app',
        messagingSenderId: messagingSenderId,
        appId: appId,
      };
    }
  } catch (e) {
    // Fallback to default public project config
  }

  return {
    apiKey: 'AIzaSyD6MeDzhHuktnbV0fLUh34SNdZMtFnAIc4',
    authDomain: 'gen-lang-client-0768881149.firebaseapp.com',
    projectId: 'gen-lang-client-0768881149',
    storageBucket: 'gen-lang-client-0768881149.firebasestorage.app',
    messagingSenderId: '32959905689',
    appId: '1:32959905689:web:4c27dd98325ff0f4d2dd08',
  };
}

if (!firebase.apps.length) {
  firebase.initializeApp(getFirebaseConfigFromSw());
}

var messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
  var notification = payload && payload.notification ? payload.notification : {};
  var data = payload && payload.data ? payload.data : {};
  var title = notification.title || data.title || 'AI Assistant & Coding Studio';
  var options = {
    body: notification.body || data.body || 'নতুন বার্তা বা আপডেট এসেছে।',
    icon: notification.icon || '/pwa-192x192.png',
    badge: '/favicon.png',
    data: {
      url: data.url || '/',
    },
  };

  self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var targetUrl = (event.notification && event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
