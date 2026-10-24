/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-43e44e5a'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "pwa-maskable-512x512.png",
    "revision": "e0baa60e26c748ae82ef849da887edf4"
  }, {
    "url": "pwa-512x512.png",
    "revision": "2bff7d2cf27ade1638dd62011e2892a3"
  }, {
    "url": "pwa-192x192.png",
    "revision": "a19652aeddee1c0338def47f53c7f8e8"
  }, {
    "url": "index.html",
    "revision": "74ee4ecb5f7584cf2d6f332da90eb73c"
  }, {
    "url": "icon.svg",
    "revision": "1108fed2667ac54d3f3df8a28e22c297"
  }, {
    "url": "favicon.png",
    "revision": "1b8b64a4093ea68382a2498698dc10d4"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "ce7ee2ed0662764c9ed5a329493628e5"
  }, {
    "url": "assets/purify.es-7fJ1DZ6H.js",
    "revision": null
  }, {
    "url": "assets/index.es-BDM4eB8l.js",
    "revision": null
  }, {
    "url": "assets/index-FQ2hL1Gq.js",
    "revision": null
  }, {
    "url": "assets/index-CFbS1wvd.css",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "ce7ee2ed0662764c9ed5a329493628e5"
  }, {
    "url": "favicon.png",
    "revision": "1b8b64a4093ea68382a2498698dc10d4"
  }, {
    "url": "icon.svg",
    "revision": "1108fed2667ac54d3f3df8a28e22c297"
  }, {
    "url": "pwa-192x192.png",
    "revision": "a19652aeddee1c0338def47f53c7f8e8"
  }, {
    "url": "pwa-512x512.png",
    "revision": "2bff7d2cf27ade1638dd62011e2892a3"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "e0baa60e26c748ae82ef849da887edf4"
  }, {
    "url": "manifest.webmanifest",
    "revision": "2033afddea2e3e1dbbd650322874cbf6"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html"), {
    denylist: [/^\/api(\/.*)?$/i]
  }));
  workbox.registerRoute(/^\/api(\/.*)?$/i, new workbox.NetworkOnly(), 'GET');
  workbox.registerRoute(/^https:\/\/fonts\.googleapis\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "google-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/fonts\.gstatic\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "gstatic-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 20,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');

}));
