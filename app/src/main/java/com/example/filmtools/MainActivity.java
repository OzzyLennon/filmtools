package com.example.filmtools;

import androidx.appcompat.app.AppCompatActivity;

import android.content.Context;
import android.os.Bundle;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

public class MainActivity extends AppCompatActivity {

    private WebView webView;

    // 1. 创建一个内部类作为JS和Java通信的桥梁
    public class WebAppInterface {
        Context mContext;

        WebAppInterface(Context c) {
            mContext = c;
        }

        // 2. 定义一个给JavaScript调用的方法，来控制屏幕常亮
        @JavascriptInterface
        public void keepScreenOn(boolean enable) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    if (enable) {
                        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                    } else {
                        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                    }
                }
            });
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        webView = (WebView) findViewById(R.id.webview);

        WebSettings webSettings = webView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        webSettings.setAllowFileAccessFromFileURLs(true);
        webSettings.setAllowFileAccess(true);

        // 3. 将我们创建的桥梁实例，添加到WebView中
        // "Android" 是我们给这个桥梁起的名字，JS将通过这个名字来调用我们的方法
        webView.addJavascriptInterface(new WebAppInterface(this), "Android");


        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                String jsonData = loadJSONFromAsset();
                if (jsonData != null) {
                    // 使用反引号(`)将jsonData包裹成一个合法的JavaScript多行字符串
                    String script = "javascript:window.appDataString = `" + jsonData + "`;";
                    view.evaluateJavascript(script, null);
                }
            }
        });

        webView.loadUrl("file:///android_asset/index.html");
    }

    public String loadJSONFromAsset() {
        String json = null;
        try {
            InputStream is = getAssets().open("app_data.json");
            int size = is.available();
            byte[] buffer = new byte[size];
            is.read(buffer);
            is.close();
            json = new String(buffer, StandardCharsets.UTF_8);
        } catch (IOException ex) {
            ex.printStackTrace();
            return null;
        }
        return json;
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}