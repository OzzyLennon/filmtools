package com.ozzylennon.filmtools;

import androidx.appcompat.app.AppCompatActivity;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewClientCompat;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import android.annotation.SuppressLint;
import java.nio.charset.StandardCharsets;

public class MainActivity extends AppCompatActivity {

    private WebView webView;

    // 1. 创建一个内部类作为JS和Java通信的桥梁
    public class WebAppInterface {
        Context mContext;
        WindowInsetsControllerCompat insetsController;

        WebAppInterface(Context c) {
            mContext = c;
            // 获取 WindowInsetsController
            if (getWindow() != null) {
                insetsController = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
            }
        }

        // 2. 定义一个给JavaScript调用的方法，来控制屏幕常亮
        @JavascriptInterface
        public void keepScreenOn(boolean enable) {
            runOnUiThread(() -> {
                if (enable) {
                    getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                } else {
                    getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                }
            });
        }

        // 3. (新增) 定义一个给JS调用的方法，来根据网页主题适配系统UI
        @JavascriptInterface
        public void setSystemUITheme(final String theme) {
            runOnUiThread(() -> {
                if (insetsController == null)
                    return;
                boolean isDark = "dark".equals(theme);
                // isAppearanceLightStatusBars 为 true 时，状态栏图标为深色；false 为浅色
                insetsController.setAppearanceLightStatusBars(!isDark);
                insetsController.setAppearanceLightNavigationBars(!isDark);
            });
        }

        @JavascriptInterface
        public void vibrate(int duration) {
            VibrationHelper.vibrate(mContext, duration);
        }

        @JavascriptInterface
        public void startTimerService(int totalSeconds) {
            Intent intent = new Intent(mContext, TimerService.class);
            intent.setAction(TimerService.ACTION_START);
            intent.putExtra(TimerService.EXTRA_TOTAL_SECONDS, totalSeconds);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                mContext.startForegroundService(intent);
            } else {
                mContext.startService(intent);
            }
        }

        @JavascriptInterface
        public void stopTimerService() {
            Intent intent = new Intent(mContext, TimerService.class);
            intent.setAction(TimerService.ACTION_STOP);
            mContext.startService(intent);
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // (新增) 设置应用为全屏模式，让内容可以显示在系统栏后面
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        setContentView(R.layout.activity_main);

        webView = (WebView) findViewById(R.id.webview);

        WebSettings webSettings = webView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);

        // 将我们创建的桥梁实例，添加到WebView中
        webView.addJavascriptInterface(new WebAppInterface(this), "Android");

        final WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .setDomain("appassets.androidplatform.net")
                .build();

        webView.setWebViewClient(new WebViewClientCompat() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                String jsonData = loadJSONFromAsset();
                if (jsonData != null) {
                    // 转义反引号和反斜杠，防止破坏JS模板字符串语法
                    String safeData = jsonData.replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${");
                    String script = "window.appDataString = `" + safeData + "`";
                    view.evaluateJavascript(script, null);
                }
            }
        });

        webView.loadUrl("https://appassets.androidplatform.net/assets/index.html");

        // 替代已被废弃的 onBackPressed() 方法
        getOnBackPressedDispatcher().addCallback(this, new androidx.activity.OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack();
                } else {
                    setEnabled(false); // 禁用此回调，让系统默认处理返回操作
                    getOnBackPressedDispatcher().onBackPressed();
                }
            }
        });
    }

    public String loadJSONFromAsset() {
        try (InputStream is = getAssets().open("app_data.json")) {
            ByteArrayOutputStream result = new ByteArrayOutputStream();
            byte[] buffer = new byte[4096];
            int length;
            while ((length = is.read(buffer)) != -1) {
                result.write(buffer, 0, length);
            }
            return result.toString(StandardCharsets.UTF_8.name());
        } catch (IOException ex) {
            ex.printStackTrace();
            return null;
        }
    }

}