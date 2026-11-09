# Android builds

Apply this skill when an Android project no longer compiles, Gradle sync fails, or the release build behaves differently from the debug build.

## First look

1. Run the build from the command line, not only the IDE: `./gradlew assembleRelease --stacktrace` (add `--info` or `--scan` for more). Android Studio caches can hide or invent errors.
2. Read the first error, not the last; Kotlin and KAPT errors cascade.
3. Note the versions: Android Gradle Plugin (AGP), Gradle wrapper, Kotlin, JDK (`java -version` and the Gradle JDK setting). AGP has a minimum Gradle and JDK version; a mismatch is the most common sync failure after an upgrade.

## Dependency conflicts

- `./gradlew :app:dependencies --configuration releaseRuntimeClasspath` shows the resolved tree; `dependencyInsight --dependency okhttp` explains why a version was chosen.
- "Duplicate class" errors come from two artefacts shipping the same classes (for example an old `support` library next to AndroidX, or two Guava flavours). Exclude one, or enable Jetifier only as a last resort.
- Use a version catalog (`gradle/libs.versions.toml`) and BOMs (Compose BOM, Firebase BOM) so related libraries move together.
- `compileSdk` must be at least what the newest AndroidX library requires.

## Build variants

Build types (`debug`, `release`) times product flavours (`free`, `paid`; `staging`, `prod`) produce variants such as `stagingRelease`. Put per-variant config in `buildConfigField`, `resValue` or source sets (`src/staging/`), not in runtime `if` checks. Make sure the variant you test is the one you ship.

## Release-only crashes: R8

R8 shrinks, optimises and obfuscates release builds. Typical symptoms are `ClassNotFoundException`, missing JSON fields, or a crash in reflection-based code (Gson, Retrofit interfaces, older Moshi without codegen, serialisation of enums).

1. Get the deobfuscated stack trace: upload `mapping.txt` to Crashlytics or Play Console, or run `retrace`.
2. Add precise keep rules in `proguard-rules.pro`, for example `-keep class com.example.api.model.** { *; }`, or annotate with `@Keep`. Prefer library-provided consumer rules.
3. Check `-printusage` output for what was removed.
4. Reproduce locally with `minifyEnabled true` on a debuggable copy of the release type.

## Signing

- Release signing config reads the keystore path and passwords from environment variables or `gradle.properties` outside the repository, never from committed files.
- With Play App Signing, you sign with the upload key and Google re-signs; losing the upload key is recoverable, losing an app-signing key you manage is not.
- Verify with `apksigner verify --print-certs app-release.apk`, or `bundletool` for AABs.

## Pitfalls

- `./gradlew clean` as a ritual; prefer understanding the cache key.
- Configuration cache and KSP/KAPT incompatibilities after a plugin bump.
- Native libraries (`.so`) missing for `arm64-v8a`.

Store submission comes next, under app-store-release. CI caching of the Gradle home is set up with ci-pipelines, and library upgrades follow dependency-updates.
