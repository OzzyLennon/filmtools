# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# 保留 MainActivity 不被混淆，因为它是 Android 系统的一个入口点
-keep class com.example.filmtools.MainActivity { *; }

# 如果您在 Java/Kotlin 中创建了专门用于和 JavaScript 通信的接口类，
# 也需要在这里保留它。假设这个类叫 "WebAppInterface"。
# -keep class com.example.filmtools.WebAppInterface {
#    # 保留所有被 @JavascriptInterface 注解的方法
#    @android.webkit.JavascriptInterface <methods>;
# }