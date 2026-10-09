# Edon native Windows preview

This is a .NET 10 / WPF application. Its controls, documents and canvas are native Windows components. It contains no Tauri, Electron or embedded browser.

## Develop in VS Code

Install the .NET 10 SDK and the Microsoft C# extension. Open this repository, then run:

```powershell
npm run desktop:dev
npm run desktop:check
npm run desktop:build
```

The last command creates `artifacts/windows/Edon-0.2.0-win-x64.exe`. It is a self-contained, portable x64 EXE: the end user does not need the SDK or a separate runtime installation. The preview is not code-signed and has no auto-updater or installer.

## Actual native features

- Canvas: rectangles, ellipses, text, image import and separate freehand stroke layers.
- Move, duplicate, remove and reorder layers; edit dimensions, color, opacity, text, fonts and sizes.
- Canvas zoom and fit; local image drag and drop.
- Documents: WPF rich text, font families, sizes, bold/italic, RTF and text exports.
- Pages: add, duplicate, remove; full-screen presentation with arrow keys / Escape.
- Save / open `.edonn` files, recent files, undo / redo, atomic saves and local recovery every 15 seconds.
- PNG export; native printing / Microsoft Print to PDF for canvas pages or rich text.

The web editor remains the more complete edition. Its advanced raster fill, masks, Boolean operations, audio and video have not been ported to WPF. Native brush strokes are editable freehand vector layers. Native `.edonn` and web `.edon` formats are separate; there is no automatic conversion or cloud synchronization. Recovery is not a replacement for saving and backing up a project.

Keyboard: Ctrl+S save, Ctrl+Shift+S save as, Ctrl+Z undo, Ctrl+Shift+Z redo, V select, R rectangle, O ellipse, B brush, T text, Delete selected layer, Escape end interaction. Typing in text controls does not trigger tool shortcuts.

## Download publishing

```powershell
npm run desktop:build
npm run desktop:package
npm run build
npm run deploy:dry-run
npx wrangler deploy
```

The package step splits the EXE into immutable 20 MiB static assets and writes `public/downloads/release.json`. The Worker streams those bytes in order at `/download/Edon-0.2.0-win-x64.exe`; the browser receives one executable. No recompression or client-side reconstruction occurs. Download responses include Content-Disposition and an ETag. HEAD exposes the size. The homepage enables its button only after validating the manifest and the download's HEAD content type.

Generated binaries and static download parts are ignored by Git. Every fresh deployment checkout must run the native build/package steps first to include a Windows release. A deployment without them deliberately shows “release is being prepared,” rather than a broken download. For CI, use a Windows runner with .NET 10 for the native build; transfer the generated `public/downloads` assets to the web deployment job.

Verify a downloaded file against the SHA-256 in `/downloads/release.json` with `Get-FileHash`. Do not treat an unsigned preview as a signed release.

## Your product video

Place your recording at `public/media/edon-demo.mp4`, then rebuild/deploy the web app. The homepage detects a video MIME type and switches from the real still capture to a controlled video player. No autoplay, screen recording or generated video is included. Static Assets require each asset below 25 MiB; compress a larger recording or host it on a video service before changing its URL.

## Validation

`npm run check` verifies the web suite and download handler. `Edon.exe --self-test` checks native project roundtrip, rich-text serialization, exported PNG dimensions/pixels, invalid project versions and WPF layout. It writes diagnostic artifact paths to `desktop-test-result.json`. Actual pointer interactions must also be checked in the running app; offscreen rendering alone does not verify drag behavior or Windows printing.
