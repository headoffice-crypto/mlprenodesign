# Vidéo promo MLP — 60 secondes

How to record the 60-second promo as an MP4 file you can hand to the MC.

## In a nutshell

1. Drop a royalty-free upbeat music file at `promo/music.mp3` (60 seconds, 120–135 BPM).
2. Open the preview page in your browser.
3. Go fullscreen (F), enable recording mode (R), screen-record with Windows Game Bar or OBS.
4. Save the recording as `promo.mp4` — that's the file the MC plays.

---

## Step 1 — Get the music

Three royalty-free upbeat tracks that fit. All are free, no signup required, MP3 download direct:

| Track | Length | BPM | URL |
|-------|--------|-----|-----|
| **Inspirational Background** by Music_Unlimited | 60s+ | 120 | [pixabay.com/music — search "inspirational background"](https://pixabay.com/music/search/genre/upbeat/) |
| **Upbeat Corporate** by penguinmusic | 60s+ | 130 | [pixabay.com/music — search "upbeat corporate"](https://pixabay.com/music/search/upbeat%20corporate/) |
| **Future Cinematic Background** by ASHUTOSH | 60s+ | 128 | [pixabay.com/music — search "cinematic upbeat"](https://pixabay.com/music/search/cinematic%20upbeat/) |

Or any track from these collections — they're all royalty-free for commercial use:
- https://pixabay.com/music/search/genre/upbeat/
- https://mixkit.co/free-stock-music/tag/upbeat/
- https://www.bensound.com/royalty-free-music/cinematic

**Save the file as exactly** `promo/music.mp3` (project root).

If your track is longer than 60 seconds, trim it. Quick options:
- **Online**: https://mp3cut.net (free, no account, browser-based)
- **Local**: `ffmpeg -i input.mp3 -ss 0 -t 60 -af "afade=t=in:d=1.5,afade=t=out:st=57:d=3" -c:a mp3 promo/music.mp3`

---

## Step 2 — Open the preview

Make sure the local server is running:
```bash
cd site && npx serve -l 8765 .
```

Then open: **http://127.0.0.1:8765/promo/**

A start screen confirms whether music was loaded. If you see *"🎵 Musique chargée · 60s"* you're good.

---

## Step 3 — Go fullscreen + recording mode

Once the page is loaded:
1. Click **"Démarrer la vidéo →"** once (this unlocks audio — browsers require a click).
2. Click **Pause** to stop the playback while you set up recording.
3. Press **F** (or click the fullscreen button) — page goes fullscreen.
4. Press **R** (or click "Mode enregistrement") — every UI element disappears. Only the frame shows.

The video is now ready to record.

---

## Step 4 — Record

### Option A — Windows Game Bar (built in, easiest)

1. Press **Win + G** to open the Game Bar.
2. In the "Capture" widget, click the round record button (or press **Win + Alt + R**).
3. Switch back to your browser. The recording indicator should show in the corner.
4. Click the **↺ Recommencer** button — wait, you can't click it from recording mode... so instead:

   **Better flow:**
   - Before recording: have the page paused at scene 1, in fullscreen + recording mode.
   - Move your mouse to the bottom-left (where Pause is hidden) and remember its position.
   - Start the Game Bar recording.
   - Click the Pause button (it's invisible but still clickable) — playback resumes.
   - Wait 62 seconds. The video plays through, fades to music silence at scene 11.
   - Stop the recording (**Win + Alt + R** again).

5. Your file is at `C:\Users\<you>\Videos\Captures\`.

### Option B — OBS (more control)

1. Install OBS (https://obsproject.com).
2. Add a **Display Capture** source pointing at your monitor.
3. Crop/scale to 1920×1080 if your monitor is larger.
4. Hit **Start Recording**, run the promo, hit **Stop Recording**.
5. Trim the head/tail in a quick edit if needed.

### Trimming the recording

If your final MP4 has a second or two of dead air at the start/end:
```bash
ffmpeg -i source.mp4 -ss 0.5 -t 60 -c copy promo-60s.mp4
```

---

## Customizing the video

The video is plain HTML — open `site/promo/index.html` and edit:
- **Per-scene text**: each `<section class="scene">` has its own headline / sub.
- **Scene durations**: `data-dur="3500"` is in milliseconds.
- **Source media**: paths are `/event-media/...` (already present in `site/event-media/`).
- **Prize amounts**: scenes 7 and 8.
- **Add or remove scenes**: copy/paste a `<section>` block, adjust the `data-dur`. Total of all `data-dur` values should equal 60,000.

Music timing (fade-in / fade-out) is in the script section near the bottom.

---

## Storyboard (full detail in `storyboard.md`)

Evergreen — no event-specific copy, reusable across any soirée, salon or kiosque.

| # | Scene | Length |
|---|-------|--------|
| 1 | Brand intro | 3.5 s |
| 2 | Façade AVANT | 5.5 s |
| 3 | Façade APRÈS | 5.5 s |
| 4 | Havre AVANT video | 4.0 s |
| 5 | Havre APRÈS video | 4.0 s |
| 6 | Gallery burst (7 stills) | 8.0 s |
| 7 | Audience 1 + 3 prizes | 8.5 s |
| 8 | Audience 2 + 5 prizes | 10.5 s |
| 9 | Consultation QR | 6.5 s |
| 10 | Closing logo | 4.0 s |
| | **Total** | **60.0 s** |

---

## Keyboard shortcuts in the preview

| Key | Action |
|-----|--------|
| **F** | Toggle fullscreen |
| **R** | Toggle recording mode (hides all UI) |
| **Esc** | Exit recording mode |
| **Space** | Pause / resume |
| **← / →** | Previous / next scene |
| **S** | Start (before first click) |
