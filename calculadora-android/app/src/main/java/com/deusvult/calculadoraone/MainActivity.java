package com.deusvult.calculadoraone;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebResourceResponse;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.IOException;
import java.io.InputStream;

public class MainActivity extends Activity {
    private static final String APP_ORIGIN = "https://calculadora-tributaria-one.local/";
    private static final String APP_URL = APP_ORIGIN + "index.html";
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(false);
        settings.setDatabaseEnabled(false);
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        webView.setWebViewClient(new LockedAssetClient(this));
        webView.loadUrl(APP_URL);

        setContentView(webView);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
            return;
        }
        super.onBackPressed();
    }

    private static class LockedAssetClient extends WebViewClient {
        private final Activity activity;

        LockedAssetClient(Activity activity) {
            this.activity = activity;
        }

        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            String url = request.getUrl().toString();
            if (!isAllowed(url)) {
                return null;
            }
            return assetResponse(url);
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            String url = request.getUrl().toString();
            return !isAllowed(url);
        }

        @Override
        @SuppressWarnings("deprecation")
        public boolean shouldOverrideUrlLoading(WebView view, String url) {
            return !isAllowed(url);
        }

        private static boolean isAllowed(String url) {
            return url.startsWith(APP_ORIGIN);
        }

        private WebResourceResponse assetResponse(String url) {
            String relative = url.substring(APP_ORIGIN.length());
            if (relative.isEmpty()) {
                relative = "index.html";
            }
            if (relative.contains("..")) {
                return new WebResourceResponse("text/plain", "UTF-8", null);
            }
            try {
                InputStream stream = activity.getAssets().open("www/" + relative);
                return new WebResourceResponse(mimeType(relative), "UTF-8", stream);
            } catch (IOException exception) {
                return new WebResourceResponse("text/plain", "UTF-8", null);
            }
        }

        private static String mimeType(String path) {
            if (path.endsWith(".html")) {
                return "text/html";
            }
            if (path.endsWith(".css")) {
                return "text/css";
            }
            if (path.endsWith(".js")) {
                return "application/javascript";
            }
            return "application/octet-stream";
        }
    }
}
