# 11 — Brand Guidelines

> Derived from the Round-1 deck. The brand should feel like **a careful librarian with a lab notebook**: academic, warm, exact. Not "cyber-security neon", not "AI sparkle".

## 1. Name & tagline

| Item | Usage |
|------|-------|
| Product name | **VeriCite** (one word, capital V and C). Wordmark may be set lowercase as **veri / cite** stacked, as on the cover slide |
| Never | "Veri Cite", "Vericite", "VERICITE" in body text, "VeriCite AI" |
| Tagline (primary) | **Every citation and claim, verified against the live web — with the evidence attached.** |
| Short tagline | **Check the promise, live.** |
| Closing line | *A citation is a promise that the source exists and says what you claim. VeriCite checks that promise, live.* |
| Badges | `HackIIITD 2026` · `Built on TinyFish` |

## 2. Logo

The mark is a **bracket-check**: a citation bracket wrapping a tick: `[✓]`. The flagged variant is `[✗]`.

| Asset | Description | Use |
|-------|-------------|-----|
| Mark | `[✓]`, rounded strokes, stroke width ≈ 10% of height, bracket serifs rounded | Favicon, app icon, nav |
| Lockup | Mark + "VeriCite" in Inter Bold, gap = 0.4 × mark height | Nav, report header |
| Stacked wordmark | "veri" / "cite" in Inter Black, tight leading (0.85), tracking −4% | Hero, splash, slides |
| Circle mark | Mark centred in a circle (Plum fill + Cream mark, or Periwinkle fill + Plum mark) | App icon, social avatar |
| Flag mark | `[✗]` same construction | Empty/error states, "flagged" illustrations only. Never as the logo |

Rules: minimum size 16 px (mark), 80 px (lockup). Clear space = height of the bracket's serif × 2. Don't rotate, outline, add gradients, or recolour outside the palette. Build the mark as an inline SVG component (`<LogoMark/>`) using `currentColor`.

```svg
<!-- reference geometry, 48x48 -->
<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
  <path d="M14 6H8v36h6"/>   <!-- left bracket -->
  <path d="M34 6h6v36h-6"/>  <!-- right bracket -->
  <path d="M16 25l6 6 11-13"/> <!-- check -->
</svg>
```

## 3. Colour

### Core palette (sampled from the deck)

| Token | Hex | Role |
|-------|-----|------|
| `mist` | `#D8EAF7` | Page background (signature) |
| `plum` | `#4A2730` | Primary ink, headings, primary buttons, dark cards |
| `plum-deep` | `#36191F` | Code blocks / inset surfaces on plum |
| `periwinkle` | `#96A9CC` | Secondary: circles, chips, "verified" badge fill, accents |
| `cream` | `#F6F3E2` | Text/icons on plum, highlight pills |
| `paper` | `#FBFAF3` | Card/report surface on mist |
| `linen` | `#F3EEE1` | Selected/expanded row, evidence quote background |
| `plum-muted` | `#6B4A53` | Secondary text on paper/mist |

### Semantic extension (app only; use sparingly as icon/dot + text, never large fills)

| Token | Hex | Meaning |
|-------|-----|---------|
| `ok` | `#2F6B4F` | Verified / current (icon tint) |
| `warn` | `#8A5A12` | Needs review / partially verified / outdated |
| `bad` | `#9A3B3B` | Not found / not supported / retracted / contradicted |

### Contrast (WCAG, checked)
| Pair | Ratio | Pass |
|------|-------|------|
| plum on mist | 10.5 | AAA |
| plum on paper | 12.4 | AAA |
| cream on plum | 11.6 | AAA |
| plum on periwinkle | 5.4 | AA |
| periwinkle on plum-deep | 6.7 | AA |
| plum-muted on paper | 7.4 | AAA |
| ok / warn / bad on paper | 6.0 / 5.7 / 6.6 | AA |

### Ratio
~60% mist · 25% plum · 10% periwinkle · 5% cream/paper accents. Dark mode (P2): background `plum-deep`, surfaces `plum`, text `cream`, accents `periwinkle`.

### Tailwind v4 tokens (`apps/web/app/globals.css`)
```css
@theme {
  --color-mist: #D8EAF7;
  --color-plum: #4A2730;
  --color-plum-deep: #36191F;
  --color-plum-muted: #6B4A53;
  --color-periwinkle: #96A9CC;
  --color-cream: #F6F3E2;
  --color-paper: #FBFAF3;
  --color-linen: #F3EEE1;
  --color-ok: #2F6B4F;
  --color-warn: #8A5A12;
  --color-bad: #9A3B3B;

  --font-sans: var(--font-inter), ui-sans-serif, system-ui;
  --font-mono: var(--font-plex-mono), ui-monospace, SFMono-Regular;

  --radius-card: 1.25rem;   /* deck cards are very rounded */
  --radius-pill: 9999px;
}
```
Map shadcn CSS variables: `--background: mist`, `--foreground: plum`, `--card: paper`, `--primary: plum`, `--primary-foreground: cream`, `--secondary: periwinkle`, `--secondary-foreground: plum`, `--muted: linen`, `--muted-foreground: plum-muted`, `--accent: cream`, `--destructive: bad`, `--border: color-mix(in srgb, var(--color-plum) 15%, transparent)`, `--ring: periwinkle`.

## 4. Typography

| Role | Font | Weight | Size (desktop / mobile) | Tracking |
|------|------|--------|-------------------------|----------|
| Display (hero, big numbers) | Inter | 800–900 | 96 / 56 px, leading 0.9 | −4% |
| H1 | Inter | 800 | 48 / 34 px | −3% |
| H2 | Inter | 700 | 30 / 24 px | −2% |
| H3 / card title | Inter | 700 | 20 / 18 px | −1% |
| Body | Inter | 400 | 16 px, leading 1.55 | 0 |
| Small / meta | Inter | 500 | 13 px | 0 |
| Mono: IDs, `[12]`, DOIs, API names, code | IBM Plex Mono | 400/500 | 13–14 px | 0 |
| Hand-drawn annotation (pitch only) | Permanent Marker or similar | — | — | — |

Load with `next/font/google`: `Inter({ subsets:["latin"], variable:"--font-inter" })`, `IBM_Plex_Mono({ weight:["400","500"], variable:"--font-plex-mono" })`.

## 5. Shape, layout, iconography

- **Cards:** big radius (20 px), Plum cards with Cream text for feature blocks; Paper cards on Mist for content.
- **Pills:** fully rounded; Cream pill on Plum (labels like `Not found`), Periwinkle pill with Plum text (`Verified`), Plum pill with Cream text (flags).
- **Circles:** large flat Periwinkle/Plum circles, overlapping or cropped at edges, as decorative motifs (hero, empty states). No gradients, no glassmorphism, no drop-shadows heavier than `0 1px 2px rgb(74 39 48 / .08)`.
- **Asterisk bullet:** Cream `✳` in a Plum circle as the list bullet / feature icon (from the deck).
- **Icons:** lucide-react, 1.75 px stroke, rounded caps. Status icons: `CircleCheck` (verified), `SearchX` (not found), `Quote` (not supported), `Ban` (retracted), `TriangleAlert` (needs review), `Clock` (outdated), `Loader2` (checking).
- **Grid:** 12-col, max width 1200 px, 24 px gutters; generous whitespace.
- **Code / API badges:** Plex Mono on Periwinkle (`Search API`, `Fetch API`) or Cream (`Agent API`), radius 6 px. Mirrors the "Engine" slide.

## 6. Status badge system

| Status | Label | Style | Icon |
|--------|-------|-------|------|
| `verified` | Verified | Periwinkle fill, Plum text | CircleCheck (ok) |
| `partially_verified` | Partially verified | Linen fill, Plum text, dashed Periwinkle border | CircleDashed (warn) |
| `needs_review` | Needs review | Cream fill, Plum text, Plum border | TriangleAlert (warn) |
| `not_found` | Not found | Plum fill, Cream text | SearchX |
| `not_supported` | Not supported | Plum fill, Cream text | Quote |
| `retracted` | Retracted | Plum fill, Cream text | Ban |
| `checking` / `pending` | Checking… | Paper fill, Plum-muted text | Loader2 (spin) |
| `error` | Couldn't check | Paper fill, bad text | CircleAlert |

Flags are **Plum** (serious, not alarmist red), matching the deck. Semantic colours only tint icons.

## 7. Voice & tone

**Principles:** precise · evidentiary · calm · helpful · never smug.

| Do | Don't |
|----|-------|
| "No matching paper in live scholarly search." | "This citation is FAKE!" |
| "The paper says 4%, not 40%." | "AI detected a hallucination." |
| "Retraction notice found on the publisher page (Jun 2020)." | "This paper is garbage." |
| "We could only read the abstract, so this is partially verified." | "Verified ✅" when it wasn't |
| "Fix claim to 4%" | "Auto-correct" |

- Show the evidence, then the verdict. Use numbers. Name the source (publisher, date).
- Microcopy: buttons are verbs ("Check references", "Export BibTeX", "Open source"). Empty states teach ("Drop a PDF, a .bib file, or paste your draft. We'll check every reference against the live web.").
- Loading copy names the real work: "Searching scholarly index for 'Graph Priors for Recall'…", "Reading arXiv:1706.03762…", "Checking publisher page for retraction notices…".

## 8. Imagery & motion

- No stock photos. Use flat geometric circles, the bracket mark, real product screenshots, and real evidence quotes.
- Motion: 150–250 ms ease-out; rows "settle" from Checking → verdict with a subtle fade + badge morph; trust score counts up once. Respect `prefers-reduced-motion`.

## 9. Pitch/slide styling
Mist background, giant Plum Inter Black headlines (−4% tracking), Plum cards with Cream text, Periwinkle circles cropped at slide edges, small "[✓] VeriCite" lockup top-left on every slide.
