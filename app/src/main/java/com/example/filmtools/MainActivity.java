package com.example.filmtools;

import androidx.appcompat.app.AppCompatActivity;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

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
        // 允许通过 file:// URL 访问其他 file:// URL，对于从本地加载 JS 模块或 JSON 很重要
        webSettings.setAllowFileAccessFromFileURLs(true);
        // 允许访问文件
        webSettings.setAllowFileAccess(true);


        // 让 WebView 内容在 App 内部加载，而不是调用外部浏览器
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                // 页面加载完成后，读取本地 JSON 数据并注入到 WebView 中
                String jsonData = loadJSONFromAsset();
                if (jsonData != null) {
                    // 为了防止 JSON 字符串中的特殊字符（如引号、换行符）破坏 JS 注入，我们对其进行转义
                    // 在这里，我们使用 backticks (`) 作为字符串分隔符，它支持多行，能更好地处理JSON字符串
                    // 使用反引号(`)将jsonData包裹成一个合法的JavaScript多行字符串
                    String script = "javascript:window.appDataString = `" + jsonData + "`;";
                    view.evaluateJavascript(script, null);
                }
            }
        });

        // 加载我们放在 assets 文件夹里的网页文件
        webView.loadUrl("file:///android_asset/index.html");
    }

    // 新增一个方法，用于从 assets 文件夹读取 JSON 文件内容
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