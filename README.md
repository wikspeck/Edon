# Edon

Edon is a browser-based professional visual design workspace.

Edon also contains a versioned, agent-friendly application service and OpenAPI contract for future external integrations. The network API and MCP endpoint are intentionally not exposed yet because the current product stores data only in the browser and has no server identity provider. See [Public API](docs/api/README.md) and [ChatGPT/MCP readiness](docs/integrations/README.md).

## Development

```bash
npm install
npm run dev
```

## Validation and deployment

```bash
npm run lint
npm run typecheck
npm run build
npm run test:api
npm run validate:openapi
npm run check
npm run deploy:dry-run
```

The production SPA is emitted to `dist/` and deployed as Cloudflare Worker static assets through `wrangler.jsonc`.

## Editors and audio

Choose Canvas, Document, or Music when creating a file. File types are fixed. Older mixed files keep their contents; “Open document copy” extracts their text into a separate Document file.

Music supports two locally imported tracks, independent trim ranges and first-beat offsets, manually entered BPM, shared playback, an equal-power crossfader, three-band EQ, and stereo WAV export (up to 30 minutes). BPM sync uses playback-rate changes, which also change pitch. Audio blobs persist in IndexedDB in the current browser; session settings persist with the file. Spotify audio is never routed through the mixer or included in WAV exports.

The Spotify integration uses Authorization Code with PKCE, the Web API, and the Web Playback SDK. Register both `https://edon.wik-speck.workers.dev/` and `http://127.0.0.1:5173/` as Redirect URIs, including the trailing slash, and enable Web API and Web Playback SDK in the Spotify app. The public Client ID is configured in `src/music/spotify.ts`; no Client Secret is needed. Account login, app development-mode access, and Premium streaming must be tested with the account owner. Spotify song embeds also work without an API login. Spotify playback and the local mixer are mutually exclusive.

Browser regressions: open `/scripts/editor-browser-tests.html` on the Vite development server to run actual raster, Boolean, mask-export, and Web Audio checks. This test page is excluded from the production bundle.

### Music library and Auto DJ

Import multiple audio files into the global, browser-local Library. Songs survive project changes; playlists reference songs without duplicating audio. Song and playlist notes, estimated BPM/key/energy and waveform peaks are stored in IndexedDB alongside original audio blobs. Use **Backup** to export a portable `.edonmusic` file including audio and metadata; **Restore** merges it into the current library. Browser storage is not a remote account backup, and clearing browser data removes local audio.

Drag library songs onto decks, playlists or the queue. Queue entries can be reordered by dragging or arrow buttons. Enable **Auto DJ**, then **Play queue**: playback follows the queue, with shorter fades for larger tempo/key differences and outgoing bass reduction when both estimated energies are high. Compatibility ordering is an explicit helper action, preserving manual order otherwise. EQ/level controls remain live. BPM sync currently changes speed **and pitch**; key comparisons describe the original analyzed audio, not pitch-shifted playback. BPM and key estimates can be corrected in song details; reload a deck to apply corrections. This is heuristic analysis, not a guarantee of musical compatibility.

`npm run test:music` checks synthetic pulse tempo and harmonic compatibility. With a local dev server, open `/scripts/music-storage-check.html` to check binary backup/restore and truncated-backup rejection in actual IndexedDB. The check uses an isolated QA asset key and does not replace the main library.

### Independent DJ dashboard

The music workspace now has four dockable panes (Decks, Mixer, Library, Queue) with independent scrolling. Drag a pane title onto another pane to swap dock locations. Float opens a movable, resizable window; close docks it again. Dock order and floating positions are remembered locally. Drag the horizontal separator to resize the upper/lower workspace.

Each deck has independent Play/Pause, Stop, waveform seeking, Cue/Set cue and 4/8/16-beat loops. A/B shortcuts toggle the respective deck; Space toggles the audible deck when focus is outside editable controls. Scrubbing, manual transport or moving the crossfader takes control from Auto DJ. Loading a song affects only its target deck. New sessions default to original tempo and A-only output.

The mixer crossfader controls equal-power gains and displays both gain curves and its live position. Each deck has low/mid/high EQ, a bipolar low-/high-pass filter, resonance, beat-timed echo, reverb and pan. The frequency-response curve uses the actual BiquadFilter response; spectrum and output meters read the processed Web Audio signal. Waveform peaks show the original audio, while the spectrum shows live processed output. Filter changes do not rewrite the original audio file.

Auto DJ preloads the next queued song into the idle deck, starts it at the transition, moves the crossfader and stops the outgoing deck, alternating A → B → A. With Sync enabled it aligns starts to the outgoing estimated beat grid. It shortens transitions for large tempo/key differences and reduces outgoing bass for two high-energy songs. Fade now triggers the transition immediately. Starting Auto DJ is an explicit action after reopening a project; browser autoplay policy still requires a user gesture. Loops hold the outgoing deck until disabled. Sync currently changes pitch as well as tempo. Export decks renders the loaded decks at current settings, not a recording of the live queue performance.

Open `/scripts/dj-audio-check.html` on the local dev server and click Run DJ audio tests to exercise actual Web Audio independent transports, seeking, crossfader gains, filter response, loops, alternating transitions and rendered echo/reverb tails.

DJ keyboard, linked sliders, beat grid and transition modes: [Bedienungs-Steckbrief](docs/dj-bedienung.md).
