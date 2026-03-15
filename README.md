# FilmTools (胶片摄影工具箱)

[English](#english) | [中文](#chinese)

---

<a name="english"></a>
## English

FilmTools is an Android application specifically designed for film photography enthusiasts, integrating various practical photographic calculation tools and a darkroom timer. It features a hybrid architecture combining an Android native container with a WebView, providing a modern user interface and smooth operation experience.

### Key Features

#### 1. Reciprocity Failure Calculation
- **Multi-preset Support**: Built-in reciprocity compensation curves for mainstream films (e.g., Kodak T-Max, Ilford HP5, Fuji Acros, etc.).
- **Custom Compensation**: Supports entering custom P-values for compensation calculations.
- **ND Filter Compensation**: Automatically calculates exposure time increases when using ND filters.
- **Bellows Compensation**: Precisely calculates exposure compensation for close-up photography based on focal length and bellows extension.

#### 2. Depth of Field (DoF) Calculation
- **Multi-format Support**: Supports various film formats from 135 full frame and medium format to large format.
- **Precise Parameters**: Calculates hyperfocal distance, near DoF, far DoF, and total DoF based on focal length, aperture, and focus distance.

#### 3. Flash Exposure Calculation
- **Multi-mode Calculation**: Supports calculating aperture, distance, or flash power.
- **Modifier Compensation**: Accounts for light loss from flash modifiers (e.g., diffusers, bounce, etc.).

#### 4. Darkroom Timer
- **Immersive Interface**: Unique "liquid" visual effect, simulating developer fluid levels changing over time.
- **Background Operation**: Implemented via Android Service to ensure stable timing in the background.
- **Notification Interaction**: Displays real-time progress in the notification bar during timing, with a quick-stop button.
- **Multi-sensory Feedback**: Provides audio (Tick sound) and vibration alerts when timing ends.

### Technical Architecture

#### Android Side
- **Language**: Kotlin
- **Core Technologies**:
  - `WebView` & `WebViewAssetLoader`: Loads local static assets for high-performance Web interaction.
  - `TimerService`: Foreground service ensures the timer runs stably in the background.
  - `SoundPool`: Low-latency audio playback for timer tick sounds.
  - `JavascriptInterface`: Bi-directional communication between JS and Android native features (e.g., vibration, screen-on, theme control).

#### Web Front-end
- **Stack**: HTML5, CSS, JavaScript (ES6 Modules)
- **Animation**: `anime.js` for smooth UI transitions.
- **Responsive Layout**: Custom Tailwind-like styling system with dark/light mode support.
- **Internationalization**: Supports dynamic switching between Chinese and English.

### Project Structure

```text
d:\filmtools
├── app/
│   ├── src/main/
│   │   ├── java/com/ozzy/filmtools/    # Android Native Code (Kotlin)
│   │   │   ├── MainActivity.kt        # Entry point, JS Bridge
│   │   │   ├── TimerService.kt        # Timer background service
│   │   │   └── VibrationHelper.kt     # Vibration helper
│   │   ├── assets/                    # Web Front-end Assets
│   │   │   ├── index.html             # Main page
│   │   │   ├── js/                    # Business logic & libs
│   │   │   ├── css/                   # Stylesheets
│   │   │   └── app_data.json          # Film curves and other config data
│   │   └── res/                       # Android Resources (Icons, layouts, strings)
├── gradle/                            # Gradle config
└── build.gradle.kts                   # Project build config
```

### Development and Build

#### Requirements
- Android Studio Ladybug | 2024.2.1 or later
- JDK 11
- Android SDK 24+ (Android 7.0+)

#### Build Steps
1. Clone the project: `git clone <repository-url>`
2. Open the project in Android Studio.
3. Wait for Gradle sync to complete.
4. Connect an Android device or start an emulator.
5. Click the `Run` button to deploy.

---

<a name="chinese"></a>
## 中文

FilmTools 是一款专为胶片摄影爱好者设计的 Android 应用，集成了多种实用的摄影计算工具和暗房计时器。它采用 Android 原生容器结合 WebView 的混合架构，提供了现代化的用户界面和流畅的操作体验。

### 核心功能

#### 1. 倒易律失效计算 (Reciprocity Failure)
- **多预设支持**：内置主流胶片（如 Kodak T-Max, Ilford HP5, Fuji Acros 等）的倒易律补偿曲线。
- **自定义补偿**：支持输入自定义的 P 值进行补偿计算。
- **ND 滤镜补偿**：自动计算加入 ND 滤镜后的曝光时间增加量。
- **皮腔补偿**：根据焦距和皮腔伸展长度，精确计算近摄时的曝光补偿。

#### 2. 景深计算 (Depth of Field)
- **多画幅支持**：支持从 135 全画幅、中画幅到大画幅等多种底片格式。
- **精确参数**：根据焦距、光圈和对焦距离，计算超焦距、近景深、远景深和总景深。

#### 3. 闪光灯计算 (Flash Exposure)
- **多模式计算**：支持计算光圈、距离或闪光功率。
- **附件补偿**：考虑闪光灯附件（如柔光罩、反射等）带来的光损耗。

#### 4. 暗房计时器 (Darkroom Timer)
- **沉浸式界面**：独特的 "液体" 视觉效果，模拟显影液位随时间变化。
- **后台运行**：基于 Android Service 实现，支持在后台持续计时。
- **通知交互**：计时过程中在通知栏显示实时进度，并提供快捷停止按钮。
- **多感官反馈**：计时结束时提供声音（Tick 声）和震动提醒。

### 技术架构

#### Android 端
- **开发语言**：Kotlin
- **核心技术**：
  - `WebView` & `WebViewAssetLoader`：加载本地静态资源，实现高性能的 Web 交互。
  - `TimerService`：前台服务确保计时器在后台稳定运行。
  - `SoundPool`：低延迟音频播放，用于计时器 Tick 声。
  - `JavascriptInterface`：实现 JS 与 Android 原生功能的双向通信（如震动、屏幕常亮、主题控制）。

#### Web 前端
- **技术栈**：HTML5, CSS, JavaScript (ES6 Modules)
- **动画库**：`anime.js` 实现丝滑的 UI 动画。
- **自适应布局**：采用类 Tailwind 的自定义样式系统，支持深色/浅色模式切换。
- **国际化**：支持中英文多语言动态切换。

### 目录结构

```text
d:\filmtools
├── app/
│   ├── src/main/
│   │   ├── java/com/ozzy/filmtools/    # Android 原生代码 (Kotlin)
│   │   │   ├── MainActivity.kt        # 主入口，JS 桥接
│   │   │   ├── TimerService.kt        # 计时器后台服务
│   │   │   └── VibrationHelper.kt     # 震动辅助工具
│   │   ├── assets/                    # Web 前端资源
│   │   │   ├── index.html             # 主页面
│   │   │   ├── js/                    # 业务逻辑与库
│   │   │   ├── css/                   # 样式表
│   │   │   └── app_data.json          # 胶片曲线等配置数据
│   │   └── res/                       # Android 资源 (图标、布局、多语言字符串)
├── gradle/                            # Gradle 配置
└── build.gradle.kts                   # 项目构建配置
```

### 开发与构建

#### 环境要求
- Android Studio Ladybug | 2024.2.1 或更高版本
- JDK 11
- Android SDK 24+ (Android 7.0+)

#### 构建步骤
1. 克隆项目：`git clone <repository-url>`
2. 使用 Android Studio 打开项目。
3. 等待 Gradle 同步完成。
4. 连接 Android 设备或启动模拟器。
5. 点击 `Run` 按钮进行部署。

## 许可证
[待补充]

---
*由 FilmTools 开发团队维护 / Maintained by FilmTools Development Team*
