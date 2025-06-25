package com.example.filmtools; // 请确保这行与您项目的包名一致

import androidx.appcompat.app.AppCompatActivity;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends AppCompatActivity {

    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        webView = (WebView) findViewById(R.id.webview);

        // 设置 WebView
        WebSettings webSettings = webView.getSettings();

        // 开启 JavaScript 支持，这是我们的计算器能运行的关键
        webSettings.setJavaScriptEnabled(true);
        // 开启 DOM Storage API 支持，用于保存语言偏好和自定义胶片
        webSettings.setDomStorageEnabled(true);

        // 让 WebView 内容在 App 内部加载，而不是调用外部浏览器
        webView.setWebViewClient(new WebViewClient());

        // 加载我们放在 assets 文件夹里的网页文件
        // "file:///android_asset/" 是一个固定路径，指向 assets 目录
        webView.loadUrl("file:///android_asset/index.html");
    }

    // 添加返回键逻辑，使得在 WebView 内可以后退，而不是直接退出 App
    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}