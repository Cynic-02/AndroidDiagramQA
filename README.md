# DiagramMind — Mobile App (React Native + TypeScript)

A companion Android/iOS app for the [DiagramMind](https://github.com/Cynic-02/CSE499) web platform.

Upload any diagram image → the 4-stage AI pipeline generates Bloom's-taxonomy-leveled Q&A pairs, and you can study them interactively.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native 0.73+ (TypeScript) |
| Design | Neo-Brutal Skeu Glass (custom tokens) |
| Local DB | SQLite via `react-native-sqlite-storage` |
| Auth | JWT Bearer Token (shared with web backend) |
| API | Next.js REST + SSE streaming at `localhost:3000` |
| State | React hooks + DiagramRepository pattern |

---

## Features

- 🔐 **Auth** — Login / Register (shared JWT with web)
- 🧠 **4-Stage AI Pipeline** — Live streaming progress (Vision → Generate → Answer → Verify)
- 🌸 **Bloom's Taxonomy Picker** — Choose difficulty level per session
- 📋 **Results Screen** — MCQ with correct answers, short-answer with expandable view
- 🎓 **Study Mode** — Interactive quiz with instant MCQ feedback + AI grading for short answers
- 💬 **Chat** — Ask follow-up questions about any diagram
- 📊 **History** — Synced from web backend
- 🌙 **Dark / Light Mode** — System-aware theming

---

## Setup

### Prerequisites
- Node.js 18+
- React Native CLI
- Android Studio + Android SDK (for Android)
- Xcode (for iOS, macOS only)

### Install

```bash
npm install
```

### Run (requires web backend at localhost:3000)

```bash
# Android
npx react-native run-android

# iOS
cd ios && pod install && cd ..
npx react-native run-ios
```

### Backend
Start the [DiagramMind web backend](https://github.com/Cynic-02/CSE499):
```bash
cd ../CSE499
npm run dev   # runs on :3000
```

---

## Project Structure

```
src/
  api/          # apiClient.ts — Axios + Bearer auth
  components/   # UI components (Neo-Brutal Skeu Glass)
  db/           # SQLite DAOs
  hooks/        # useAuth, useSessions, useChat
  navigation/   # AppNavigator (Stack)
  repository/   # DiagramRepository — single source of truth
  screens/      # All screens
  theme/        # Tokens, colors, ThemeContext
  types/        # Shared TypeScript models
  utils/        # NetworkMonitor, HapticUtil, etc.
```

---

## Design System — Neo-Brutal Skeu Glass

Three visual layers applied to every card/button:
1. **Brutal** — Hard ink offset shadow (no blur), thick ink border
2. **Skeu** — Diagonal `LinearGradient` from `primary → accent`
3. **Glass** — `BlurView` + semi-transparent surface tint

Zero hardcoded `#ffffff` or `#000000` — all colors come from the theme palette.
