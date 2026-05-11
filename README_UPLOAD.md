# LifeOS GitHub Upload Pack

This folder is for people who do not have Git installed locally.

Upload these items to a new empty GitHub repository using **Add file -> Upload files**:

1. `.github` folder
2. `lifeos-source.zip`
3. `README_UPLOAD.md`

Then open **Actions**, select **Build LifeOS APK From Zip**, and click **Run workflow**.

When the workflow completes, download the `LifeOS-debug-apk` artifact. It contains `app-debug.apk`.

Do not upload `node_modules`.
