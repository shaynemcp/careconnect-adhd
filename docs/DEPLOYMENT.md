# Deployment Guide

How to build and ship CareConnect on each platform. Run commands from the repository root unless a step
says otherwise.

| Platform | Output | Status on November 3, 2026 |
| --- | --- | --- |
| Web | Live site on GitHub Pages | Deployed from `dev` at `94b3d1b` |
| Flutter | `app-release.apk` | Built and tested on November 3 |
| React Native | Android APK | Built on November 3 from the final code and tested on an emulator |
| Electron | macOS `.dmg` (Apple Silicon) | Built and launched on November 3 from the final code |

## Web (React PWA)

**Live site:** <https://shaynemcp.github.io/careconnect-adhd/>

Deployment is automatic. [`deploy-web.yml`](../.github/workflows/deploy-web.yml) runs on any push to `dev` that
changes `apps/web`, `packages/` or the lockfile, or by hand from the Actions tab:

1. Runs `npm ci` and `npm run build:web`, taking `BASE_PATH` and `SITE_URL` from the Pages settings.
2. Publishes `dist/` to the `github-pages` environment.
3. Runs the Chromium E2E suite against the live URL.

To build the same thing by hand:

```bash
BASE_PATH=/careconnect-adhd/ SITE_URL=https://shaynemcp.github.io/careconnect-adhd npm run build:web
```

To try a production build locally, including the service worker:

```bash
npm run build:web && npm run preview --workspace @careconnect/web
```

Any static host works. Serve `apps/web/dist` at the root with no `BASE_PATH`, and rewrite all paths to
`/index.html`. See the [web README](../apps/web/README.md#deployment) for one-time Pages setup and custom domains.

**PWA checks:** the site needs HTTPS (Pages provides it), `manifest.webmanifest` and `sw.js`. In Chrome or Edge,
the **Install CareConnect** banner or the address bar icon confirms it's installable.

## Android and iOS with Flutter

**Prerequisites:** Flutter 3.47 or newer, Java 17 for Gradle (newer versions have failed for the team) and the Android
SDK. Point Flutter at Java 17 once:

```bash
flutter config --jdk-dir "/Library/Java/JavaVirtualMachines/openjdk-17.jdk/Contents/Home"
```

**Android:**

```bash
cd apps/mobile-flutter && flutter pub get && flutter build apk --release
```

The output is `build/app/outputs/flutter-apk/app-release.apk` (about 53 MB). Install it with:

```bash
adb install -r build/app/outputs/flutter-apk/app-release.apk
```

Don't run `flutter test` while a build is running, because they clash over `.dart_tool`.

The release build is signed with the debug key. That's fine for coursework and side-loading, but a store release needs a
real keystore.

**iOS:** needs a Mac with Xcode and an Apple signing identity.

```bash
cd apps/mobile-flutter && flutter build ios --release
```

The team hasn't produced an IPA, because that needs an Apple Developer account.

## Android and iOS with React Native (Expo)

`apps/react-mobile` is a standalone project with its own lockfile, so install there first:

```bash
cd apps/react-mobile && npm ci
```

**With EAS Build** (needs a free Expo account). The repository has no `eas.json` yet, so the first step creates it:

```bash
npx eas-cli login
```

```bash
npx eas-cli build:configure
```

An Android profile needs `"android": { "buildType": "apk" }` in `eas.json` to produce an installable APK instead of an
AAB. Then run:

```bash
npx eas-cli build --platform android --profile preview
```

EAS builds in the cloud and gives you a download link. iOS builds (`--platform ios`) need an Apple Developer account.

**Locally** (needs Java 17 and the Android SDK):

```bash
npx expo prebuild --platform android
```

```bash
cd android && ./gradlew assembleRelease
```

The output is `android/app/build/outputs/apk/release/app-release.apk`. `expo prebuild` generates the `android` folder, which
isn't part of the repository.

The first build took about 40 minutes, and later ones are much faster. If a download from Maven Central fails partway through,
run the same command again. This build is signed with the Android debug key, so it's fine for installing and testing, but not for
an app store.

The November 3 APK is 49.5 MB. It added `-PreactNativeArchitectures=arm64-v8a,x86_64` to the Gradle command, so it runs on 64-bit
phones and x86_64 emulators, but not on 32-bit phones. It was tested on an Android emulator, not a physical phone.

## Desktop with Electron

**Windows installer.** Run this on Windows:

```bash
npm ci
```

```bash
npm run package:win --workspace @careconnect/desktop
```

This builds `apps/web`, packages the app, flips the Electron security fuses and creates
`apps/desktop/release/CareConnect-Setup.exe`. The installer is per-user and goes to `%LocalAppData%\CareConnect`. It isn't
code-signed, so SmartScreen may warn on first run. See the [desktop README](../apps/desktop/README.md#windows-installer) for why
this path uses Squirrel instead of electron-builder's NSIS target.

**macOS.** For development, start the web dev server, then Electron in a second terminal:

```bash
npm run dev:web
```

```bash
npm run dev:desktop
```

To build the installer on a Mac with Apple Silicon, package the app first:

```bash
npm run build:web && cd apps/desktop && npx electron-builder --mac dmg --arm64 --publish never -c.mac.icon=assets/icon.png
```

electron-builder skips signing without a Developer ID, which leaves the bundle's signature incomplete. So give it an ad-hoc
signature, still in `apps/desktop`, and build the `.dmg` from the signed app:

```bash
codesign --force --deep --sign - release-builder/mac-arm64/CareConnect.app
```

```bash
mkdir -p /tmp/cc-dmg && cp -R release-builder/mac-arm64/CareConnect.app /tmp/cc-dmg/ && ln -sf /Applications /tmp/cc-dmg/Applications
```

```bash
hdiutil create -volname CareConnect -srcfolder /tmp/cc-dmg -ov -format UDZO release-builder/CareConnect-macOS-arm64.dmg
```

The app isn't notarized, so on another Mac the first launch needs **Open Anyway** in **System Settings > Privacy & Security**. A
signed and notarized build would need an Apple Developer account.

## Publishing the build files

Attach the APKs and the installer to a GitHub Release, so anyone with the repository link can download them:

```bash
gh release create a12-final <files> --repo shaynemcp/careconnect-adhd --target main --title "CareConnect final (A12)"
```
