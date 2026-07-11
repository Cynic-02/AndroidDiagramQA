# DiagramQA Android App Wrapper

This is a native Android WebView wrapper for the **DiagramQA** web application, built with Kotlin, Gradle, and AndroidX.

It features:
- **Swipe-to-Refresh Layout**: Swipe down on the screen to refresh or reload the page.
- **Embedded WebView Client**: Pages load internally within the app context.
- **Local DOM Storage**: Enables persistent local database/session storage inside the device.
- **Secure File Chooser Handler**: Bypasses Android's default security blockers to let users select diagram images directly from their camera/gallery.
- **Auto CI/CD Compilation**: Push to GitHub to trigger the action and download the built APK.

---

## 🛠️ Configuration

### Changing the Target Website URL
By default, the application is configured to connect to your local emulator loopback address (`http://10.0.2.2:3000`) for development. To change this:

1. Open `app/src/main/java/com/diagramqa/app/MainActivity.kt`.
2. Find the `WEBSITE_URL` constant inside the companion object at the bottom of the class:
   ```kotlin
   companion object {
       // Replace this with your hosted website URL in production
       private const val WEBSITE_URL = "https://your-production-url.com"
   }
   ```
3. Update it to your production URL and save the changes.

---

## 📦 How to Build the APK

### Method 1: Automatic GitHub Actions (Recommended)
You do not need to install Android SDK or Gradle locally to generate the APK.
1. Commit this project to a GitHub repository.
2. The GitHub Actions runner will automatically trigger the build pipeline specified in `.github/workflows/android.yml`.
3. Once the build finishes (takes ~1-2 minutes), go to the **Actions** tab in your GitHub repository, click on the latest run, scroll down to the **Artifacts** section, and download the `DiagramQA-debug-apk` zip file containing your executable APK!

### Method 2: Android Studio
1. Open Android Studio on your PC.
2. Select **Open an Existing Project** and choose the `E:\1.Semester 262\499 A` directory.
3. Gradle will sync, configure, and download the dependencies automatically.
4. Select **Build > Build Bundle(s) / APK(s) > Build APK(s)** to compile the executable file.
