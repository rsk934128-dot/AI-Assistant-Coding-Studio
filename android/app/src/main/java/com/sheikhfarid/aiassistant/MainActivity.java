package com.sheikhfarid.aiassistant;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Message;
import android.webkit.CookieManager;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

public class MainActivity extends BridgeActivity {
    private void openExternalUrl(String url) {
        if (url == null || url.isEmpty()) return;
        try {
            if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("mailto:") || url.startsWith("tel:")) {
                Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(intent);
            }
        } catch (Exception ignored) {
            // Safe fallback if no external handler is installed
        }
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        try {
            WebView webview = getBridge().getWebView();
            if (webview != null) {
                WebSettings settings = webview.getSettings();
                settings.setJavaScriptEnabled(true);
                settings.setDomStorageEnabled(true);
                settings.setDatabaseEnabled(true);
                settings.setSupportMultipleWindows(true);
                settings.setJavaScriptCanOpenWindowsAutomatically(true);
                settings.setMediaPlaybackRequiresUserGesture(false);

                CookieManager.getInstance().setAcceptThirdPartyCookies(webview, true);

                // Preserve Capacitor's BridgeWebChromeClient (mic, camera, geolocation, file chooser)
                // while properly routing window.open / target="_blank" links to the external browser.
                webview.setWebChromeClient(new BridgeWebChromeClient(getBridge()) {
                    @Override
                    public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, Message resultMsg) {
                        WebView.HitTestResult hitResult = view.getHitTestResult();
                        String extraUrl = hitResult != null ? hitResult.getExtra() : null;
                        if (extraUrl != null && (extraUrl.startsWith("http://") || extraUrl.startsWith("https://"))) {
                            openExternalUrl(extraUrl);
                            return false;
                        }

                        if (resultMsg == null || !(resultMsg.obj instanceof WebView.WebViewTransport)) {
                            return false;
                        }

                        final WebView tempWebView = new WebView(view.getContext());
                        tempWebView.setWebViewClient(new WebViewClient() {
                            @Override
                            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest request) {
                                Uri uri = request != null ? request.getUrl() : null;
                                if (uri != null) {
                                    openExternalUrl(uri.toString());
                                }
                                tempWebView.destroy();
                                return true;
                            }
                        });
                        WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
                        transport.setWebView(tempWebView);
                        resultMsg.sendToTarget();
                        return true;
                    }
                });
            }
        } catch (Exception ignored) {
            // Safe fallback if bridge is initializing
        }
    }
}
