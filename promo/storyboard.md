# MLP — Marketing video — Storyboard

**Format:** screen-recorded MP4 from the HTML preview at `/promo/`.
**Runtime:** exactly 60.000 s · 12 scenes · 1920×1080 / 16:9.
**Music:** `promo/music.mp3` — royalty-free upbeat, 60 s, ~125 BPM.

A **lead-generation marketing video** — not a presentation. Hooks viewers, makes the gifts the payoff, ends with a clear CTA. Reusable across any soirée, salon, kiosque, social media reel, or website hero.

---

## The 12 scenes

| # | In  | Out | Dur | Scene | On-screen content |
|---|----:|----:|----:|-------|-------------------|
| 1 | 0.0  | 3.0  | 3.0 | **Hook**           | Façade after (Ken Burns) + headline `Votre maison vaut peut-être plus que vous pensez.` |
| 2 | 3.0  | 5.0  | 2.0 | **Avant 1**        | Façade before (alone) · tag `AVANT` |
| 3 | 5.0  | 8.0  | 3.0 | **Après 1**        | Façade after (alone) · gold tag `APRÈS` |
| 4 | 8.0  | 10.0 | 2.0 | **Avant 2**        | Salon before (alone) · tag `AVANT` |
| 5 | 10.0 | 13.0 | 3.0 | **Après 2**        | Salon after (alone) · gold tag `APRÈS` |
| 6 | 13.0 | 17.0 | 4.0 | **Havre video**    | Full-frame Havre after video, no overlay text |
| 7 | 17.0 | 25.0 | 8.0 | **Gallery**        | 8 finished rooms, 1.0 s each, hard cuts |
| 8 | 25.0 | 29.0 | 4.0 | **Promise**        | Big serif: `On transforme votre propriété en patrimoine.` |
| 9 | 29.0 | 34.0 | 5.0 | **Prize hook**     | `Jusqu'à` · **14 000 $** (massive gold) · `en services MLP offerts` |
| 10 | 34.0 | 48.0 | 14.0 | **Prize grid (all 8)** | Two columns, staggered reveal. **Total = 14 000 $** |
| 11 | 48.0 | 56.0 | 8.0 | **CTA + QR**       | `Une consultation gratuite. Sans engagement.` + big QR → `/consultation` |
| 12 | 56.0 | 60.0 | 4.0 | **Closeout**       | Brand mark + `(450) 500-8936  ·  mlprenodesign.ca` |

Adds to: 3 + 2 + 3 + 2 + 3 + 4 + 8 + 4 + 5 + 14 + 8 + 4 = **60.0 s**.

---

## Prize grid contents (scene 10)

Left column — **Acheteurs & investisseurs** (3 prizes):
| Prize | Value |
|-------|------:|
| Plan d'optimisation de votre propriété | 1 500 $ |
| Étude de faisabilité municipale | 2 000 $ |
| Évaluation de 3 propriétés — ROI chiffré | 2 500 $ |

Right column — **Rénovation & maison de rêve** (5 prizes):
| Prize | Value |
|-------|------:|
| Îlot de cuisine offert | 2 000 $ |
| Bain ou douche installé | 1 500 $ |
| Refonte design — cuisine, bain ou sous-sol | 1 500 $ |
| Carte-cadeau MLP | 1 000 $ |
| Carte-cadeau MLP | 2 000 $ |

**Grand total: 14 000 $**

---

## Marketing-video principles applied

1. **No brand intro card.** A marketing video opens with a *value statement*, not the company name. Brand identity comes at the close.
2. **Image-first, words-second.** Hook scene and avant/après scenes have minimal text. The work speaks.
3. **One sentence per scene.** No bullet lists, no audience explainers. Each scene = one idea.
4. **The gifts are a payoff, not a list.** Big "14 000 $" reveal happens *after* the work + the promise. Curiosity → value → action.
5. **Single CTA.** Scan to book a consultation. One QR, one URL.
6. **Reusable.** Zero references to a specific event, date, or audience.

---

## Music + audio plan

| Time | Audio note |
|------|------------|
| 0.0–1.5 s | Music fades in from 0 → 0.7 volume |
| 1.5–58 s  | Music holds at 0.7 volume |
| 58–60 s   | Music fades out 0.7 → 0 over 1.5 s |

The music currently in `promo/music.mp3` is a 60 s FFmpeg-synthesized placeholder beat. Swap in a real royalty-free track from Pixabay Music / Mixkit / Bensound — save as `promo/music.mp3` and `site/promo/music.mp3`, then reload.

---

## Editing the video

Open `site/promo/index.html` and edit:
- **Per-scene text:** each `<section class="scene">` block
- **Scene durations:** `data-dur="N"` is in milliseconds — all values must sum to 60000
- **Source media:** paths under `/event-media/...`
- **Prize amounts and labels:** scene 10's `.pg-row` blocks
- **Hook copy:** scene 1's `.h` element
- **Promise line:** scene 8's `.h` element
- **QR target:** `QR_TARGET` constant near the top of the `<script>` block
