# iOS signing

Apply this skill when Xcode or a CI job refuses to sign an iOS app, an archive will not export, or a build installs on one device but not another.

## The pieces

Signing works only when all of these agree:

| Piece | Where it lives | Must match |
|---|---|---|
| Signing certificate (Apple Development / Apple Distribution) plus its private key | login keychain or CI keychain | the team; key must be present, not only the certificate |
| App ID (bundle identifier) with capabilities | Apple Developer portal | `PRODUCT_BUNDLE_IDENTIFIER` |
| Provisioning profile (development, ad hoc, App Store, enterprise) | `~/Library/MobileDevice/Provisioning Profiles` | certificate, App ID, devices (for dev and ad hoc), entitlements |
| Entitlements file | `.entitlements` in the target | capabilities enabled on the App ID |
| Team ID | Xcode "Signing & Capabilities" | profile and certificate team |

Extensions (widgets, notification service extensions, watch apps) are separate targets with their own bundle IDs and profiles.

## Diagnose

1. Read the exact error in the build log (Report navigator), not the summary banner.
2. Inspect the profile: `security cms -D -i profile.mobileprovision` shows its App ID, team, devices, expiry and entitlements.
3. List identities with private keys: `security find-identity -v -p codesigning`. A certificate without its key shows in Keychain Access but not here.
4. Check what was signed: `codesign -d --entitlements :- MyApp.app` and `codesign --verify --deep --strict --verbose=2 MyApp.app`.

## Common errors

- "No signing certificate found": certificate missing or its private key not on this machine. Export a `.p12` from the machine that created it, or revoke and recreate.
- "Provisioning profile doesn't include the currently selected device": add the device UDID in the portal and regenerate the development profile.
- "Entitlements ... not in the provisioning profile": a capability (Push Notifications, Associated Domains, App Groups, iCloud) was added in Xcode but not in the profile; regenerate it.
- Install fails with "unable to verify app": expired profile or revoked certificate.

## Automatic vs manual

Automatic signing is fine on developer machines. On CI use manual signing or fastlane `match`, which keeps certificates and profiles encrypted in a private Git repository or bucket, plus App Store Connect API keys instead of an Apple ID password. In CI, create a temporary keychain, import the `.p12`, and delete the keychain after the job.

## Pitfalls

- Distribution certificate limits per team; revoking one breaks every profile built on it for other people too.
- Enterprise profiles distributed outside the company break Apple's terms.
- Cached derived data with old settings; delete `DerivedData` for the project before concluding.

Submission to App Store review is handled by app-store-release. The push entitlement's server side is covered by push-notifications, and the CI job itself by ci-pipelines.
