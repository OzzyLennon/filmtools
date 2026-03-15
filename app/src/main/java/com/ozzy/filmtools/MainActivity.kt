package com.ozzylennon.filmtools

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.AudioAttributes
import android.media.SoundPool
import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewClientCompat
import java.io.ByteArrayOutputStream
import java.io.IOException
import java.io.InputStream
import java.nio.charset.StandardCharsets

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    
    // SoundPool for low-latency audio playback (e.g., dial tick)
    private lateinit var soundPool: SoundPool
    private var tickSoundId: Int = 0
    private var isSoundLoaded: Boolean = false

    // 1. 创建一个内部类作为JS和Java通信的桥梁
    inner class WebAppInterface(private val mContext: Context) {
        private var insetsController: WindowInsetsControllerCompat? = null

        init {
            // 获取 WindowInsetsController
            window?.let {
                insetsController = WindowCompat.getInsetsController(it, it.decorView)
            }
        }

        // 2. 定义一个给JavaScript调用的方法，来控制屏幕常亮
        @JavascriptInterface
        fun keepScreenOn(enable: Boolean) {
            runOnUiThread {
                if (enable) {
                    window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                } else {
                    window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                }
            }
        }

        // 3. (新增) 定义一个给JS调用的方法，来根据网页主题适配系统UI
        @JavascriptInterface
        fun setSystemUITheme(theme: String) {
            runOnUiThread {
                val controller = insetsController ?: return@runOnUiThread
                val isDark = theme == "dark"
                // isAppearanceLightStatusBars 为 true 时，状态栏图标为深色；false 为浅色
                controller.isAppearanceLightStatusBars = !isDark
                controller.isAppearanceLightNavigationBars = !isDark
            }
        }

        @JavascriptInterface
        fun vibrate(duration: Int) {
            VibrationHelper.vibrate(mContext, duration)
        }

        @JavascriptInterface
        fun startTimerService(totalSeconds: Int) {
            val intent = Intent(mContext, TimerService::class.java).apply {
                action = TimerService.ACTION_START
                putExtra(TimerService.EXTRA_TOTAL_SECONDS, totalSeconds)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                mContext.startForegroundService(intent)
            } else {
                mContext.startService(intent)
            }
        }

        @JavascriptInterface
        fun stopTimerService() {
            val intent = Intent(mContext, TimerService::class.java).apply {
                action = TimerService.ACTION_STOP
            }
            mContext.startService(intent)
        }
        @JavascriptInterface
        fun playTickSound() {
            if (isSoundLoaded) {
                // Play sound: leftVolume, rightVolume, priority, loop, rate
                val result = soundPool.play(tickSoundId, 0.8f, 0.8f, 1, 0, 1.0f)
                if (result == 0) {
                    android.util.Log.e("FilmTools", "SoundPool.play failed (returned 0)")
                }
            } else {
                android.util.Log.w("FilmTools", "playTickSound called but sound not loaded yet")
            }
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        android.util.Log.d("FilmTools", "MainActivity onCreate")

        // --- 初始化 SoundPool ---
        val audioAttributes = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_GAME) // Best for low-latency feedback
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()
        soundPool = SoundPool.Builder()
            .setMaxStreams(10) // More streams for fast scrolling
            .setAudioAttributes(audioAttributes)
            .build()
            
        soundPool.setOnLoadCompleteListener { _, sampleId, status ->
            android.util.Log.d("FilmTools", "Sound loaded: sampleId=$sampleId, status=$status")
            if (status == 0) {
                isSoundLoaded = true
            }
        }
        tickSoundId = soundPool.load(this, R.raw.tick, 1)
        android.util.Log.d("FilmTools", "Sound load requested: tickSoundId=$tickSoundId")

        requestNotificationPermission()

        // (新增) 设置应用为全屏模式，让内容可以显示在系统栏后面
        WindowCompat.setDecorFitsSystemWindows(window, false)

        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webview)

        val webSettings = webView.settings
        webSettings.javaScriptEnabled = true
        webSettings.domStorageEnabled = true

        // 将我们创建的桥梁实例，添加到WebView中
        webView.addJavascriptInterface(WebAppInterface(this), "Android")

        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .setDomain("appassets.androidplatform.net")
            .build()

        webView.webViewClient = object : WebViewClientCompat() {
            override fun shouldInterceptRequest(
                view: WebView,
                request: WebResourceRequest
            ): WebResourceResponse? {
                return assetLoader.shouldInterceptRequest(request.url)
            }

            override fun onPageFinished(view: WebView, url: String) {
                super.onPageFinished(view, url)
                val jsonData = loadJSONFromAsset()
                if (jsonData != null) {
                    // 转义反引号和反斜杠，防止破坏JS模板字符串语法
                    val safeData = jsonData.replace("\\", "\\\\")
                        .replace("`", "\\`")
                        .replace("\${", "\\\${")
                    val script = "window.appDataString = `$safeData`"
                    view.evaluateJavascript(script, null)
                }
            }
        }

        webView.loadUrl("https://appassets.androidplatform.net/assets/index.html")

        // 替代已被废弃的 onBackPressed() 方法
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    isEnabled = false // 禁用此回调，让系统默认处理返回操作
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })
    }

    private fun requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(
                    this,
                    Manifest.permission.POST_NOTIFICATIONS
                ) != PackageManager.PERMISSION_GRANTED
            ) {
                ActivityCompat.requestPermissions(
                    this,
                    arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                    101
                )
            }
        }
    }

    private fun loadJSONFromAsset(): String? {
        return try {
            val inputStream: InputStream = assets.open("app_data.json")
            val result = ByteArrayOutputStream()
            val buffer = ByteArray(4096)
            var length: Int
            while (inputStream.read(buffer).also { length = it } != -1) {
                result.write(buffer, 0, length)
            }
            result.toString(StandardCharsets.UTF_8.name())
        } catch (ex: IOException) {
            ex.printStackTrace()
            null
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        soundPool.release()
    }
}
