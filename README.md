# LifeOS

LifeOS is an offline-first Expo/React Native Android app for planning the day, tracking actual time minute by minute, reconstructing a timeline, and generating local execution insights.

## Privacy and offline behavior

- No backend server.
- No cloud database.
- SQLite stores plans, events, focus sessions, and backups on the device.
- AsyncStorage stores lightweight preferences.
- Assistant memory, planning, reports, and accountability data stay in local storage.
- Speech-to-text and text-to-speech use bundled Sherpa-ONNX models in release builds, not Android's built-in speech APIs.
- Directions and live travel times open Google Maps because route data requires a maps provider.

## Accountability features

- Fast daily capture turns one line per commitment into today's plan.
- Planned start-time reminders ask whether you are doing what you said you would do.
- Check-in nudges ask what you are doing during the day.
- End-of-day review nudges ask what finished, what slipped, and tomorrow's first move.
- The Today screen shows an Accountability Coach question based on due, overdue, and untracked commitments.
- Reports include an accountability score that rewards task completion and honest check-ins while penalizing untracked time.

## Assistant features

- The hotword is fixed to `Hey Bob`.
- Assistant replies are spoken with bundled offline Sherpa-ONNX TTS in release builds.
- Voice commands are captured with bundled offline Sherpa-ONNX STT in release builds.
- Commands can add tasks, start/stop focus with intervals, log notes and distractions, summarize the day, ask what to do next, open known apps, open music, call by phone number or contact name, take pictures, pick files, check the time, estimate time to the next task, open directions, and search maps.
- The assistant is time-conscious: greetings, next-action prompts, task timing, and accountability questions are based on today's plan, check-ins, overdue commitments, and untracked time.
- Fully closed-app, screen-off hotword listening requires a custom Android foreground service. The current Expo release build supports in-app voice plus scheduled voice-style reminders and notifications.

## Setup

Use Node.js 20.19.4 or newer. Expo SDK 55 and React Native 0.83 require Node 20.19.4+, so Node 18 will print engine warnings and may fail during install or builds.

```bash
npm install
npx expo start
```

For Android development builds:

```bash
npx expo run:android
```

## Typecheck

```bash
npm run typecheck
```

## Build an installable APK

Install and authenticate EAS CLI, then run:

```bash
npm run build:android:apk
```

The `apk` profile in `eas.json` produces an internal distribution APK. The `production` profile produces an Android App Bundle.

## Build with GitHub Actions

This project includes `.github/workflows/android-apk.yml`, which can build an installable signed release APK on GitHub. See `GITHUB_BUILD.md`.

If you do not have Git installed locally, use the generated upload pack from the parent folder:

- `/home/spot/coding/lifeos-upload-pack`
- `/home/spot/coding/lifeos-upload-pack.zip`

The upload pack contains fewer than 10 files/items and includes a workflow that builds from `lifeos-source.zip`.

## Project structure

- `app/` contains Expo Router screens.
- `src/db/` contains SQLite schema, connection, and repositories.
- `src/services/` contains timeline reconstruction, scoring, notifications, and backup import/export.
- `src/ai/` contains the local offline reasoning engine and deterministic fallback.
- `src/components/` contains reusable UI primitives.

## GitHub push

To replace the GitHub repository with this project:

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
