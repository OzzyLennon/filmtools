# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# 保留 WebAppInterface 中所有被 @JavascriptInterface 注解的方法
# 这是 WebView JS 桥梁的核心，混淆后会导致 JS 调用失败
-keepclassmembers class com.ozzylennon.filmtools.MainActivity$WebAppInterface {
    @android.webkit.JavascriptInterface <methods>;
}