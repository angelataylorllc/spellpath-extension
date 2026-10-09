# Loading vignette art library

> **Status (Oct 8, 2026):** **Parked until MVP1 ships.** Assets and genre layout: repo root [`inspo/8bit/`](../../inspo/8bit/) (`_vendor/`, `_pool/`, `pool-index.json`). Session handoff: local `docs/session-notes.md` → Session 14. No extension wiring yet.

Pixel art **inside the loading card** only (scaffold, quiz, beat waits). Full-screen genre atmosphere stays as-is in CSS.

## Direction (current)

- **Look:** Chunky RPG / platformer pixel (320×180–640×360 plates)—not painterly VN, not tiny icon sprites.
- **Placement:** Cropped “window” in the card (`object-fit: cover`), optional rounded frame.
- **Motion:** **Parallax** layers (CSS drift), **animated** loops/sheets, or **composite** (parallax + overlay e.g. rain).
- **Pools:** ~3–5 vignette recipes per **genre × day/night**; pick one per wait (random / hash / tags later).
- **Mood refs (not for ship):** [`loading-art-references/`](loading-art-references/) — taste only.

**Commercial use:** Ship inside the extension; do not resell raw packs. Confirm license in each download before import.

---

## Vignette pool (genre × mode)

Cost and license are from each pack’s itch page (Mar 2026); verify in zip before shipping.

| Genre | Mode | Vignette (source) | Cost | License | Motion |
|-------|------|-------------------|------|---------|--------|
| **Fantasy** | Day | [Clouds parallax](https://captainskolot.itch.io/clouds-parallax-backgrounds-featuring-clouds-sky-and-a-small-forest-pixel-art-sp) (Skolot) | ~$4.49 | CC-BY 4.0; commercial; modify OK; no resell; AI-assisted | parallax |
| **Fantasy** | Day | [Parallax field](https://codecrackers.itch.io/parallax-field) | Free (PWYW) | Royalty free; credit optional | parallax |
| **Fantasy** | Day | [Spruce Castle](https://myaumya.itch.io/spruce-castle-background) — day layers | PWYW | Commercial; modify OK; no resell; **no AI** | parallax |
| **Fantasy** | Day | [Pastel fantasy landscapes](https://captainskolot.itch.io/4-pastel-fantasy-landscapes-pixel-art-background-pack) (4× 200×128) | ~$5 | CC-BY 4.0; AI-assisted | static / light CSS |
| **Fantasy** | Day | [edermunizz castle BG4 — day](https://edermunizz.itch.io/pixel-art-castle-backgrounds) | ~$9 | Commercial; modify OK; no redistribute; **no AI** | parallax |
| **Fantasy** | Day | [Pixel Skies](https://digitalmoons.itch.io/pixel-skies) — bright set ([demo](https://digitalmoons.itch.io/pixel-skies-demo) to try) | ~$8.90 | Commercial; modify OK; credit not required; **no AI** | parallax / static |
| **Fantasy** | Day | [Pixel Nook parallax](https://the-pixel-nook.itch.io/parallax-backgrounds-demo) — bright biome ([premium](https://the-pixel-nook.itch.io/parallax-backgrounds)) | Demo free / ~$5 premium | Commercial; modify OK; no resell; **no AI** | parallax |
| **Fantasy** | Night | [Twilight Aether Isles](https://captainskolot.itch.io/twilight-aether-isles-pixelart-pixel-art-floating-island-fantasy-rpg-animated-ba) (rain) | (see itch) | CC-BY 4.0; AI-assisted | **anim** |
| **Fantasy** | Night | Spruce Castle — night layers | (same pack) | (same) | parallax |
| **Fantasy** | Night | edermunizz castle BG4 — night | (same pack) | (same) | parallax |
| **Fantasy** | Night | [Aetherborn islands / ruins](https://captainskolot.itch.io/4-aetherborn-backgrounds-pixel-art-sky-islands-ruins-steampunk-city) | ~$2.49+ | CC-BY 4.0; AI-assisted | static / light CSS |
| **Fantasy** | Night | Pixel Skies — moon / star sets | (same pack) | (same) | parallax |
| **Fantasy** | Night | [Arludus medieval](https://arludus.itch.io/2d-pixel-art-medieval-backgrounds-pack) — moon scenes | ~$9 | Commercial game use; no resell pack; **no AI** | parallax |
| **Sci-fi** | Day | [Helianthus Space II](https://helianthus-games.itch.io/pixelart-space-backgrounds-set-new) — bright + yellow twinkle | ~$3.50 | Commercial; no credit; **no AI** listed | **anim** layers |
| **Sci-fi** | Day | [Feony animated backgrounds](https://feony-labs.itch.io/animated-pixel-art-backgrounds-free) — space loop | Free | Page: CC-BY-ND; body text also mentions commercial — **read LICENSE in zip** | **anim** |
| **Sci-fi** | Day | [Free futuristic city](https://free-game-assets.itch.io/free-futuristic-city-pixel-art-backgrounds) | PWYW | Confirm in zip (Craftpix); **no AI** | parallax |
| **Sci-fi** | Night | Helianthus Space II — dark + blue twinkle/comet | (same pack) | (same) | **anim** layers |
| **Sci-fi** | Night | Futuristic city — neon variants | (same pack) | (same) | parallax |
| **Sci-fi** | Night | [Pixel City](https://digitalmoons.itch.io/pixel-city) + Pixel Skies night | ~$2.90 + skies | Commercial; **no AI** | parallax |
| **Mystery** | Day | Arludus — town / overcast scene | ~$9 | Commercial; no resell; **no AI** | parallax |
| **Mystery** | Day | Pixel Nook — grey / overcast biome | Demo free / ~$5 | Commercial; **no AI** | parallax |
| **Mystery** | Night | Pixel City + [PVFX Rain Field](https://nerijs.itch.io/pvfx-foundry) overlay | ~$2.90 + free | City: commercial; rain: **CC0** | composite |
| **Mystery** | Night | [Animated night city](https://dlou-saiyan.itch.io/animated-night-city-parallax-background-2d-pixel-art-urban-skyline) (Dlou) | ~$5.95 | Commercial; **credit Dlou Saiyan**; no resell; **no AI** | parallax + **anim** |
| **Mystery** | Night | Futuristic city at night | Free PWYW | Confirm in zip | parallax |
| **Mystery** | Night | Feony — urban / dark loop (if style fits) | Free | Verify LICENSE in zip | **anim** |
| **Horror** | Day | Arludus — dark overcast crop | ~$9 | Commercial; **no AI** | parallax |
| **Horror** | Day | Pixel Skies — storm / grey | ~$8.90 | Commercial; **no AI** | parallax |
| **Horror** | Night | edermunizz castle — night | ~$9 | Commercial; **no AI** | parallax |
| **Horror** | Night | [Fiery dungeon](https://captainskolot.itch.io/4-fiery-dungeon-backgrounds-pixel-art-lava-cave-magma-chambers-and-infernal-dep) | ~$5 | CC-BY 4.0; AI-assisted | static / light CSS |
| **Horror** | Night | Feony — darkest loop (if suitable) | Free | Verify LICENSE in zip | **anim** |
| **Adventure** | Day | Parallax field | Free | Royalty free | parallax |
| **Adventure** | Day | [Arabian desert](https://myaumya.itch.io/arabian-desert-background) (Myaumya) | ~$2 | Commercial; **no AI** | parallax |
| **Adventure** | Day | Pixel Nook — desert-like biome | Demo free / ~$5 | Commercial; **no AI** | parallax |
| **Adventure** | Day | Arludus — wilderness scene | ~$9 | Commercial; **no AI** | parallax |
| **Adventure** | Day | [vnitti desert scroll](https://vnitti.itch.io/desert-background) (alt) | ~$9 | Commercial; credit appreciated; no resell | parallax |
| **Adventure** | Night | Pixel Skies — dusk / sunset + Arludus silhouette | ~$8.90 + optional $9 | Commercial | parallax |
| **Adventure** | Night | [Marine backgrounds](https://captainskolot.itch.io/4-beautiful-marine-backgrounds-pixel-art-ocean-lighthouse-and-underwater-scenes) (lighthouse storm) | ~$5 | CC-BY 4.0; AI-assisted | static / light CSS |
| **Adventure** | Night | Feony loop (if fits) | Free | Verify LICENSE in zip | **anim** |
| **Adventure** | Night | [Haaris pixel sky](https://haarisdev.itch.io/pixel-sky-background) — desert/sunset | ~$1 | Commercial; **credit Haaris Mughal** | parallax |

**Shared overlay (any recipe):** [PVFX Foundry](https://nerijs.itch.io/pvfx-foundry) — **Free**, **CC0** (rain, smoke, portal).

**Sci-fi alternates:** [Helianthus Space I](https://helianthus-games.itch.io/parallax-space-background) (~$3+, commercial) · [OVERSTELLAR](https://overboy.itch.io/overstellar-pixel-art-animated-planets-stars-space-backgrounds) (~$49, commercial).

**Mystery alt workflow:** [Rain-Slicked](https://chiewaters.itch.io/rain-slicked) (~$20, commercial, AI-assisted, top-down tiles).

---

## Source packs (download checklist)

| Pack | Link |
|------|------|
| Helianthus Space II | https://helianthus-games.itch.io/pixelart-space-backgrounds-set-new |
| Feony animated (free) | https://feony-labs.itch.io/animated-pixel-art-backgrounds-free |
| Digital Moons Pixel Skies | https://digitalmoons.itch.io/pixel-skies |
| Digital Moons Pixel City | https://digitalmoons.itch.io/pixel-city |
| Arludus medieval ×12 | https://arludus.itch.io/2d-pixel-art-medieval-backgrounds-pack |
| edermunizz castles | https://edermunizz.itch.io/pixel-art-castle-backgrounds |
| Free futuristic city | https://free-game-assets.itch.io/free-futuristic-city-pixel-art-backgrounds |
| Parallax field | https://codecrackers.itch.io/parallax-field |
| CaptainSkolot | https://captainskolot.itch.io |
| Myaumya | https://myaumya.itch.io |
| Pixel Nook | https://the-pixel-nook.itch.io/parallax-backgrounds-demo |
| Dlou night city | https://dlou-saiyan.itch.io/animated-night-city-parallax-background-2d-pixel-art-urban-skyline |
| PVFX Foundry | https://nerijs.itch.io/pvfx-foundry |

---

## Runtime (when we implement)

- Filter by `genre` + `mode` from [`ThemeContext`](../src/contexts/ThemeContext.jsx).
- **MVP:** random from pool (like [`loadingFlavor.js`](../src/config/loadingFlavor.js)).
- **Later:** subject hash or keyword tags.
- **`prefers-reduced-motion`:** static frame, no parallax.

---

## Next steps

1. Download checklist packs; note exact `$` and LICENSE from each zip.
2. Crop-test; keep **3–5 rows per genre × mode** in the table above.
3. HTML preview, then scaffold screen wiring.
