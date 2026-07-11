# DiagramQA — Native Android App

**DiagramQA** is a full-fledged, world-class **native Android** application built with Kotlin, Material 3, Room, Retrofit, and Coroutines. It lets a user upload a diagram image and ask questions about it via a Vision-Language Model (VLM) backend.

> This is **NOT a WebView wrapper**. Every screen — splash, home, chat, viewer, settings — is a real native Android Activity rendered with native View bindings, Material 3 components, vector drawables, animations, and offline-first persistence.

---

## ✨ Features

### Native UI / UX
- **Splash screen** with animated logo, gradient background, floating orbs, and pulsing loading dots (Android 12 SplashScreen API + custom animation).
- **Home screen** with hero gradient header, native `RecyclerView` of session cards, ripple effects, animated FAB that shrinks on scroll, swipe-to-refresh, empty-state illustration.
- **Q&A chat screen** with two-sided chat bubbles, avatars, animated typing indicator, send button with custom ripple, "AI is thinking" state.
- **Image viewer** full-screen with share intent.
- **Settings screen** with toggleable dark mode (follows system / always on / always off), animations toggle, haptics toggle, cache clear, history clear, app version + backend info.
- **Bottom sheet** image source picker (Camera / Gallery).
- **Adaptive launcher icon** (Material You monochrome support) with PNG fallbacks at all densities (mdpi → xxxhdpi).
- **Custom animations** for activity transitions, splash entrance, bubble entrance, pop-in dialogs, floating orbs, pulsing dots, fade-scale dialog open/close, layout-animation fall-down on list items.
- **Material 3 theming** — full light + dark color schemes, shape system, typography, ripple colors.

### Connectivity & Offline
- **`NetworkMonitor`** uses `ConnectivityManager.NetworkCallback` to emit a `LiveData<Boolean>` that the whole app observes.
- **When online**: every question is sent to the VLM backend; responses are persisted to Room.
- **When offline**:
  - Splash → home → chat screens all show a banner reading **"No Connection Available Now"**.
  - The user's question is **persisted locally** and queued in a `pending_ops` table.
  - When connectivity returns, the repository **automatically flushes** the queue and shows a "Pending questions synced" toast.
  - A full-screen **"No Connection Available Now"** view with Retry + Continue Offline buttons is wired in `view_no_connection.xml`.
- **Haptic feedback** on send / FAB / long-press, with a user-controlled toggle.

### Architecture (MVVM)
```
┌─────────────────────────────────────────────────────────────┐
│ Activity / Fragment (View layer)                            │
│   ↳ ViewBinding, Material 3, animations                     │
└─────────────────────────────────────────────────────────────┘
                          ↕ observes
┌─────────────────────────────────────────────────────────────┐
│ ViewModel (AndroidViewModel)                                │
│   ↳ Exposes LiveData, talks to Repository                   │
└─────────────────────────────────────────────────────────────┘
                          ↕ calls
┌─────────────────────────────────────────────────────────────┐
│ DiagramRepository (single source of truth)                  │
│   ↳ Coordinates Room DB + Retrofit API + NetworkMonitor     │
│   ↳ Queues ops when offline, flushes when online            │
└─────────────────────────────────────────────────────────────┘
              ↘                       ↙
        ┌──────────┐           ┌────────────┐
        │ Room DB  │           │ Retrofit   │
        │ sessions │           │ /diagrams  │
        │ messages │           │ /ask       │
        │ pending  │           │ /ping      │
        └──────────┘           └────────────┘
```

---

## 🧱 Tech Stack

| Concern               | Library / Approach                                    |
|-----------------------|-------------------------------------------------------|
| Language              | Kotlin 1.9.22                                          |
| Build                 | Android Gradle Plugin 8.2.2, Gradle 8.5                |
| Min SDK               | 24 (Android 7.0)                                       |
| Target SDK            | 34 (Android 14)                                        |
| UI                    | Material 3 (`com.google.android.material:material:1.11.0`) |
| Layout                | ViewBinding + ConstraintLayout + RecyclerView          |
| Persistence           | Room 2.6.1                                             |
| Networking            | Retrofit 2.9 + OkHttp 4.12 + Moshi 1.15                |
| Async                 | Coroutines 1.7.3, Flow, LiveData                       |
| Image loading         | Coil 2.5                                               |
| Animations            | Native `anim` XML, `ViewPropertyAnimator`, LayoutAnimation |
| Splash                | `androidx.core:core-splashscreen:1.0.1`                |
| Preferences           | DataStore Preferences 1.0                              |
| Permissions           | Internet, Network state, Camera, Media images, Vibrate |

---

## 📁 Project Structure

```
DiagramQA/
├── .github/workflows/android.yml          # CI: builds debug + release APK on push
├── gradle/wrapper/                         # Gradle 8.5 wrapper
├── app/
│   ├── build.gradle                        # App module config + all dependencies
│   ├── proguard-rules.pro                  # ProGuard rules for Retrofit/Moshi/Room
│   └── src/main/
│       ├── AndroidManifest.xml
│       ├── java/com/diagramqa/app/
│       │   ├── DiagramQAApp.kt             # Application — wires singletons + theme
│       │   ├── SplashActivity.kt           # Animated splash
│       │   ├── MainActivity.kt             # Home screen
│       │   ├── QnAActivity.kt              # Chat screen
│       │   ├── ImageViewerActivity.kt      # Full-screen diagram viewer
│       │   ├── SettingsActivity.kt         # Settings
│       │   ├── data/
│       │   │   ├── local/                  # Room: Entities, DAOs, AppDatabase
│       │   │   ├── remote/                 # Retrofit: ApiService, ApiClient
│       │   │   └── repository/             # DiagramRepository, Result sealed
│       │   ├── ui/
│       │   │   ├── adapter/                # SessionsAdapter, ChatAdapter
│       │   │   ├── dialog/                 # ImagePickerSheet bottom sheet
│       │   │   └── viewmodel/              # HomeViewModel, QnAViewModel
│       │   └── util/                       # NetworkMonitor, ImageUtil, Haptics, etc.
│       └── res/
│           ├── anim/                       # 16 animation XMLs
│           ├── animator/                   # Button elevation state list
│           ├── drawable/                   # 30+ vector icons + backgrounds
│           ├── drawable-anydpi-v24/        # Adaptive launcher
│           ├── layout/                     # 9 layout XMLs
│           ├── menu/                       # 5 menu XMLs
│           ├── mipmap-*/                   # PNG launcher fallbacks (all densities)
│           ├── mipmap-anydpi-v26/          # Adaptive launcher XML
│           ├── values/                     # colors, dimens, strings, themes
│           ├── values-night/               # Dark theme overrides
│           └── xml/                        # network security config, file paths
├── build.gradle                            # Root build file
├── settings.gradle
├── gradle.properties
├── gradlew / gradlew.bat                   # Wrapper scripts
└── README.md
```

---

## 🚀 Building the APK

### Method 1: GitHub Actions (Recommended — no local setup needed)

1. Push this project to a GitHub repository.
2. The workflow at `.github/workflows/android.yml` triggers on every push.
3. Wait ~2 minutes, open the **Actions** tab, click the latest run, scroll to **Artifacts**, and download `DiagramQA-debug-apk.zip`.

### Method 2: Android Studio

1. Open Android Studio → **Open an existing project** → select the `DiagramQA` folder.
2. Let Gradle sync (it will download all dependencies automatically).
3. Select **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
4. The debug APK appears under `app/build/outputs/apk/debug/`.

### Method 3: Command line

```bash
cd DiagramQA
./gradlew assembleDebug          # produces app/build/outputs/apk/debug/app-debug.apk
./gradlew assembleRelease        # produces app/build/outputs/apk/release/app-release-unsigned.apk
```

You need JDK 17 installed. Gradle 8.5 is fetched automatically by the wrapper.

---

## 🔌 Backend Contract

The app talks to a backend that exposes three endpoints:

```http
POST /diagrams                # multipart/form-data with field "image" + "name"
                              # → 200 { "id": "...", "url": "..." }

POST /diagrams/{id}/ask       # application/json
                              # body: { "question": "...", "session_id": "..." }
                              # → 200 { "answer": "...", "diagram_id": "...", "usage_tokens": 123 }

POST /diagrams/ping           # health check
                              # → 200 (empty)
```

To point the app at your backend, edit `app/build.gradle`:

```groovy
buildConfigField "String", "BASE_URL", "\"https://your-backend.com/\""
```

For local development, the debug build uses `http://10.0.2.2:3000/` (emulator → host loopback).

> If your VLM provider uses a different contract (e.g. OpenAI Vision, Anthropic, Google Gemini), simply adapt `ApiService.kt` and `DiagramRepository.ensureDiagramUploaded` / `askQuestion`.

---

## 🔒 Permissions

| Permission                          | Why                                    |
|-------------------------------------|----------------------------------------|
| `INTERNET`                          | Talk to the VLM backend                |
| `ACCESS_NETWORK_STATE`              | `NetworkMonitor` detects offline mode  |
| `ACCESS_WIFI_STATE`                 | Connectivity info on Wi-Fi             |
| `READ_EXTERNAL_STORAGE` (≤32)       | Pick diagrams from gallery on old OS   |
| `READ_MEDIA_IMAGES` (≥33)           | Pick diagrams on Android 13+           |
| `CAMERA`                            | (Future) capture diagrams directly     |
| `VIBRATE`                           | Haptic feedback on send / FAB          |

No location, no contacts, no analytics, no ads.

---

## 🎨 Design system

- **Primary**: `#5B4DFF` (Indigo / Violet)
- **Primary Dark**: `#3F2FE0`
- **Secondary**: `#FF6B9D` (Pink)
- **Tertiary**: `#1EC8A5` (Teal)
- **Error**: `#BA1A1A`
- **Light background**: `#FDFBFF`
- **Dark background**: `#131318`
- Corner radius: 12dp (small), 16dp (medium), 20dp (large), 28dp (bottom sheet), 50% (pill)

The full Material 3 token set is in `res/values/colors.xml` and `res/values/themes.xml`.

---

## 🛣 Roadmap

- Capture photo directly via `ACTION_IMAGE_CAPTURE` + FileProvider (currently routes through gallery picker).
- Streaming AI responses (server-sent events).
- Multi-diagram sessions.
- Export chat transcript as PDF.
- On-device fallback VLM (MediaPipe LLM) for true zero-network operation.

---

## 📝 License

This project is provided as-is for educational / project use. Replace the placeholder backend with your own production service before shipping.
