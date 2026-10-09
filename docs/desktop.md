# Windows app

Edon 0.3 ships the complete React editor in Electron for Windows x64. The web editor and desktop renderer use the same source, tools, autosave and exporters. No Tauri. The renderer is sandboxed, has context isolation, no Node integration, and a restrictive CSP. Bundled assets use the secure local `edon://app` protocol; local editing works offline.

## Build in VS Code

Use Node 22.12+ and npm, on Windows:

```powershell
npm ci
npm run desktop:check
npm run desktop:dev
npm run desktop:build
npm run desktop:package
npm run build
npm run deploy:dry-run
```

`desktop:build` ensures the official Electron runtime is available and produces `artifacts/electron/Edon-0.3.0-win-x64.exe`. Open that portable EXE without installing a runtime. It is unsigned; signing needs a publisher certificate. The unpacked build lives alongside it for development testing. Close the unpacked test app before rebuilding that folder. App/window/taskbar branding uses the same revised Edon icon.

## Persistence and moving work

The app saves projects in its own browser storage under Electron's Edon user-data folder. Audio/video libraries use IndexedDB. Portable means no installer; data still lives in the user profile and survives launching a new EXE version. Removing browser/app profile data removes the corresponding library. Web and desktop stores are independent and do not sync. Canvas, document and presentation projects can move between them using File → Export document and Import project in the file manager. Images are included in project JSON. Audio/video library media must be imported separately.

The former WPF prototype is retained in `desktop/Edon.Desktop` for existing `.edonn` files. Those files are not converted automatically; retain the legacy EXE if needed. Its recovery storage is not touched by Electron.

## Downloads and publishing

The package script derives the filename/version from package.json and splits the EXE into immutable 20 MiB static assets. `/download/<filename>` streams these in order through the Worker; release.json carries the byte length and SHA-256. Generated chunks and EXEs are ignored in Git. Always build/package before deployment so release.json and the published app match. Android/mobile gets the browser link, not an APK. There is no Android download.

## Verification

`npm run check` verifies types, lint, editor/audio/API regressions, the download router, and the production build. `tests/export-preview.html` is a local Vite-only browser regression fixture: open `/tests/export-preview.html` in development to check rendered gradients, corners, text, vectors, arrows and crisp raster pixels, then download an actual PNG. It is not part of the production build.

## Product video

Add the user's recording at `public/media/edon-demo.mp4` when ready. The homepage only plays it if a real video response exists. Until then it uses an actual editor still image. No video is manufactured.
