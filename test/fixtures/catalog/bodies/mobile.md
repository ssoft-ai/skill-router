# Mobile

Apply this skill when an app for Android or iOS (phone or tablet) is developed, built, tested on devices or published, and no narrower mobile skill covers the whole task.

## Routing

| Task | Skill |
|---|---|
| Gradle build fails, release build crashes | android-builds |
| Xcode signing, provisioning profiles | ios-signing |
| Notifications not arriving | push-notifications |
| Store submission, review rejection | app-store-release |
| Working without network | offline-sync |

## Stack decisions

Native (Kotlin with Jetpack Compose, Swift with SwiftUI) gives the best platform fit; cross-platform (Flutter, React Native, Kotlin Multiplatform, .NET MAUI) shares code at the cost of a bridge layer. Whatever the project uses, keep platform-specific code behind small interfaces so a plugin upgrade touches one place.

## Rules

- Support a defined OS range: write down `minSdk`/`targetSdk` and the minimum iOS version, and review them yearly. Google Play requires a recent `targetSdk` for updates.
- Test on real devices, not only emulators and simulators: a low-end Android phone, a recent iPhone, a tablet, and both light and dark mode. Use a device farm (Firebase Test Lab, BrowserStack, AWS Device Farm) for breadth.
- Respect the lifecycle: the OS kills background apps. Save state in `onSaveInstanceState`/`SavedStateHandle` or `@SceneStorage`, and restore it.
- Ask for permissions (location, camera, contacts, notifications) at the moment they are needed, with a reason, not all at launch.
- Network calls are slow and fail: timeouts, retries with backoff, and visible loading and error states.
- App size matters on cellular networks: watch the download size per release.
- Store user secrets in Keychain (iOS) or the Android Keystore via EncryptedSharedPreferences or DataStore, never in plain preferences.

## Release flow

1. Version name and build number bumped (`versionCode`, `CFBundleVersion`).
2. CI builds signed artefacts: AAB for Play, IPA for the App Store.
3. Internal testing track and TestFlight first.
4. Crash reporting (Firebase Crashlytics, Sentry) and analytics checked on the beta build.
5. Staged rollout to production.

## Pitfalls

- Hard-coded API base URLs per environment; use build variants or configurations.
- Ignoring accessibility: Dynamic Type, TalkBack and VoiceOver labels.
- Old app versions in the wild calling a changed API; keep backwards compatibility or force an update with a minimum-version check.
- Deep links and universal links tested only on one platform.

The build pipeline for mobile artefacts is set up with ci-pipelines. Backend endpoints the app calls are designed with api-design.
