# App store release

Apply this skill when a mobile app version is prepared for, submitted to, or rejected by Apple's App Review or Google Play's review.

## Before submission

- [ ] Version and build numbers increased; the build is uploaded (Xcode Organizer, Transporter, fastlane `deliver` and `supply`, or Gradle Play Publisher).
- [ ] Tested through TestFlight and the Play internal or closed testing track on real devices.
- [ ] Metadata per locale: name, subtitle or short description, full description, keywords (App Store), promotional text, "What's New" text.
- [ ] Screenshots for every required device size (6.9" and 6.5" iPhone, 13" iPad; phone, 7" and 10" tablet on Play), plus an optional preview video.
- [ ] Privacy: App Store privacy "nutrition label" and Play Data safety form match what the SDKs actually collect; privacy manifest (`PrivacyInfo.xcprivacy`) for required-reason APIs; a working privacy policy URL.
- [ ] Account deletion is possible inside the app if accounts can be created there.
- [ ] Demo account credentials and notes for the reviewer if features sit behind a login.
- [ ] Age rating questionnaire up to date; export compliance answered (encryption).

## Staged rollout

- Play Console: start a staged rollout at a small percentage (for example 5%, then 20%, 50%, 100%), watching Android vitals (crash rate, ANR rate) and reviews. Halt the rollout if crash-free users drop.
- App Store: phased release over seven days for automatic updates; it can be paused. Manual downloads get the new version immediately.
- Keep a server-side kill switch or feature flags for risky features; a store rollback is not possible, only a new build.

## Handling a rejection

1. Read the cited guideline number (for example 2.1 App Completeness, 4.3 Spam, 5.1.1 Data Collection) and the reviewer's message and screenshots.
2. Decide: fix and resubmit, or reply in Resolution Center (App Store) / the policy appeal form (Play) if the reviewer misunderstood.
3. Reply briefly and factually: what the feature does, where to find it, a screen recording if helpful. Do not argue about other apps.
4. For repeated or unclear rejections, request a call with App Review.

| Frequent cause | Fix |
|---|---|
| Crash on reviewer's device | test on the latest OS release and on iPad |
| Login required, no demo account | provide credentials in review notes |
| Digital goods sold outside in-app purchase | use StoreKit / Play Billing, or follow the current external purchase rules for your region |
| Metadata mentions other platforms | remove references |

## Pitfalls

- Expedited review requests used for routine releases.
- Release notes that only say "bug fixes" every time.

Signing problems at upload belong to ios-signing and android-builds. The text of the user-facing notes is written with release-notes in documents.
