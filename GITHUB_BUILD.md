# Building APKs With GitHub Actions

This repository includes one LifeOS APK workflow:

- `.github/workflows/android-apk.yml` builds the LifeOS Expo assistant app as a signed release APK.

Use the LifeOS workflow for the personal assistant APK.

## No local Git required

1. Create a new empty GitHub repository.
2. Open the repository in your browser.
3. Use **Add file -> Upload files**.
4. Upload the project files and folders from this LifeOS folder. Do not upload `node_modules`.
5. Commit the upload.
6. Open the **Actions** tab.
7. Choose **Build Android APK**.
8. Click **Run workflow**.
9. When it finishes, download the `LifeOS-release-apk` artifact.

The artifact contains `app-release.apk`, which is installable on Android after enabling installs from unknown sources.

## Push the full files with Git

If you install Git locally, push the actual editable project files like this:

```bash
cd /home/spot/coding/lifeos
git init
git remote remove origin 2>/dev/null || true
git remote add origin https://github.com/Adedoyinjames/lifeos.git
git branch -M main
git add .
git commit -m "Rebuild LifeOS assistant app"
git push --force origin main
```

The `.gitignore` keeps `node_modules`, generated Android folders, APK files, zip files, and unrelated local scripts out of the upload.

## Release signing

The LifeOS workflow generates a release signing key inside GitHub Actions and signs the APK during the build. This is enough for installing the APK on your phone. For long-term app updates, replace the generated key with a stable private keystore stored in GitHub Secrets so every release is signed with the same key.

## Requirements handled by GitHub

The LifeOS workflow installs:

- Node.js 20.19.4
- Java 17
- Android SDK
- Offline Sherpa-ONNX STT and TTS model packs

Then it runs:

```bash
npm install
mkdir -p assets/models
npm run typecheck
npx expo prebuild --platform android --clean --no-install
cd android
./gradlew assembleRelease --no-daemon
```
