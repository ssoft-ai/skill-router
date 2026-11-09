# Push notifications

Apply this skill when notifications fail to arrive on phones, arrive twice or late, or a new kind of notification is added to an app.

## The path of a notification

Your server -> provider (APNs for Apple devices, FCM for Android and optionally iOS) -> OS on the device -> app or system tray. A message can be lost at each hop, and each hop has its own logs.

## Setup checklist

- iOS: Push Notifications capability and `aps-environment` entitlement; an APNs auth key (`.p8`, with Key ID and Team ID) is preferred over per-app certificates. Sandbox tokens only work with the sandbox endpoint, production tokens with production.
- Android: `google-services.json` for the right Firebase project; `POST_NOTIFICATIONS` runtime permission on Android 13+; a notification channel created before posting, with a sensible importance.
- Server: FCM HTTP v1 API with a service account (the legacy server-key API is shut down); APNs over HTTP/2 with a JWT.

## Device tokens

1. Request permission at a meaningful moment, after explaining the value; iOS shows the system prompt only once.
2. Register on every app start and send the token to your backend with user ID, platform, app version and environment.
3. Tokens change (reinstall, restore, `onNewToken`). Upsert, never only insert.
4. Delete tokens that the provider rejects: APNs `410 Unregistered`/`BadDeviceToken`, FCM `UNREGISTERED`/`NOT_FOUND`.

## Payloads

- Notification messages are displayed by the OS; data-only messages wake the app to handle them and are throttled on both platforms when the app is in the background or the device is in Doze or Low Power Mode.
- APNs payload limit is 4 KB; FCM 4 KB. Send an ID and fetch details, not the whole content.
- Set `apns-push-type`, `apns-priority` (10 for alerts, 5 for background) and `content-available` correctly; wrong combinations are silently dropped.
- Use `collapse_key`/`apns-collapse-id` for updates that replace each other, and `mutable-content` with a Notification Service Extension for images or decryption.

## Debugging non-delivery

| Check | How |
|---|---|
| Did the provider accept it? | log the HTTP response and message ID |
| Right environment? | sandbox vs production APNs, Firebase project |
| Is the token current? | compare with the latest registration from the device |
| Did the OS suppress it? | notification permission, channel disabled, Focus mode, battery optimisation (OEM-specific on some Android brands) |
| Did the app crash handling it? | Console.app or `adb logcat` while sending |

The Firebase console and Apple's Push Notifications Console can send test pushes to a single token.

## Pitfalls

- Sending marketing pushes through the transactional channel; users disable all of them.
- Time-zone-unaware scheduled pushes at 3 a.m.

Signing and entitlements live in ios-signing. Server-side delivery metrics and alerts are tuned with alert-tuning, and the parent rules are in mobile.
