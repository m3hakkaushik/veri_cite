# 12 — UI Spec (Web, Phase 1)

Brand tokens: [11-brand-guidelines.md](11-brand-guidelines.md). Reference mock-up: deck slide "The Trust Report" (Figure 1.0).

## 0. Current frontend — workspace and stored reports (24 October 2026)

The user's workspace redesign supersedes the older marketing landing below.

- `/` and authenticated `/app/new` open the focused Plum/Mist workspace.
  The reference flow is **Add document → Review → Report**, with private signed
  uploads for PDF/BibTeX, pasted text, inline validation, real upload/dispatch
  status, and a separate review step. Sign-in is required to start a run.
- `/app` includes saved history; `/app?view=history` opens it directly.
  Reports link to `/app/runs/[id]`. Clerk's existing application handles
  Google/email sign-in, sign-up, and the profile control.
- The report reads persisted Supabase data, subscribes to row changes, and
  polls when Realtime is unavailable. It shows actual progress, trust score,
  TinyFish counts, filters, metadata differences, and expandable source evidence.
  Refreshing reads the same stored run. No illustrative verdicts are seeded.
- **Current coverage is existence only**, stated on the report. Claim support,
  integrity, fixes/exports, and Grounded Answer remain later milestones.
  Question input/review is available; its search action remains disabled.
- `/demo` renders only an actual completed `is_sample` report. Until M10 seeds
  one, it shows an honest unavailable state. The sample endpoint clones actual
  input and starts a new run; it never clones verdicts into a claimed live check.
- Local drafts survive sidebar navigation within a tab, but not refresh/login.
  A file stays local until Start check. Real uploads and submitted text are
  persisted under the authenticated owner.
- Keep the brand tokens, mobile Sheet, keyboard/focus behavior, reduced motion,
  error/loading/empty states, and semantic status text. Report layout is checked
  at desktop and 375px with actual controlled-run data.

The authenticated web walkthrough and Realtime delivery still require the M5
Verify gate. The remaining sections describe the final product contract; later
features must stay unavailable until implemented and verified.

## 1. Sitemap & routes

| Route | Access | Screen | P |
|-------|--------|--------|---|
| `/` | public | Landing | P0 |
| `/sign-in/[[...sign-in]]`, `/sign-up/[[...sign-up]]` | public | Clerk components on Mist background | P0 |
| `/demo` | public | Read-only sample Trust Report (server-rendered from the `is_sample` run) | P0 |
| `/app` | auth | Dashboard: New check + history | P0 |
| `/app/new` | auth | New check (tabs: Upload PDF · Paste text · .bib · Link) | P0 (Link P1) |
| `/app/runs/[id]` | auth | Live Trust Report | P0 |
| `/app/ask` | auth | Grounded Answer | P0 |
| `/app/ask/[id]` | auth | Saved answer | P1 |
| `/r/[shareId]` | public | Shared read-only report | P1 |
| `/how-it-works` | public | Engine explainer with TinyFish APIs | P1 |

App shell (`/app/**`): top nav with `[✓] VeriCite` lockup · `New check` · `Ask` · `History` · Clerk `<UserButton/>`. Mobile: nav collapses to a sheet.

## 2. Screens

### 2.1 Landing `/`
1. **Hero** (Mist): stacked "veri / cite" display wordmark left; overlapping circles with `[✓]` `[✓]` `[✗]` right (as on the cover slide). Tagline. CTAs: **Check my references** (primary, Plum) → `/app/new` (or sign-in) and **See a sample report** (secondary, Periwinkle) → `/demo`. Badges `HackIIITD 2026` · `Built on TinyFish`.
2. **Problem strip:** 5 stat cards (100 · 18% · 86% · 1 yr · $440K) with sources in small text.
3. **Four checks:** 2×2 Plum cards (01–04) with ✳ icon, question title, one-line description, Cream flag pills, exactly like "The Solution" slide.
4. **Grounded Answer** banner (Cream card with ✳).
5. **How it works:** 5-step horizontal flow (Input → Parse → TinyFish in parallel → Verdict → Report) with API badges.
6. **Footer:** team Savencia, IIIT Delhi / Esya, TinyFish credit.

### 2.2 Dashboard `/app`
- Left: big **New check** card with an inline dropzone (accepts PDF/.bib) + "Paste text instead" + **Try the sample paper** button (`POST /runs/sample`).
- Right/below: **History** list: title, input-type icon, created time, status pill, trust score ring. Empty state: Periwinkle circles + "No checks yet. Drop a PDF to start."

### 2.3 New check `/app/new`
- Tabs: `Upload PDF` · `Paste text` · `.bib file` · `Link` (P1).
- Upload: `react-dropzone`, shows file name/size, progress bar during signed upload.
- Paste: textarea with live char count (max 60k), placeholder showing a sample reference list.
- **Checks** (P1 toggles): Exists (locked on) · Supports · Still valid · Current (+ recency select: Last hour / 24 h / 7 days / 30 days).
- Primary button **Check references** → creates run → navigates to `/app/runs/[id]`.
- Validation errors inline (wrong file type, too big, empty).

### 2.4 Live Trust Report `/app/runs/[id]` (hero screen of the demo)

```
┌──────────────────────────────────────────────────────────────────────┐
│ ●●● VeriCite — thesis_ch2.pdf                 [Share] [PDF] [Export BibTeX] │  ← Plum header bar, Plex Mono title
├──────────────────────────────────────────────────────────────────────┤
│ 38 checked  (33 verified)  (5 flagged)                  Trust score 87% │  ← summary row
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░  Checking 36/38 · Search 41 · Fetch 5 · Agent 1 │  ← progress + TinyFish meter
│ [All] [Flagged 5] [Verified 33] [Not found] [Not supported] [Retracted] │  ← filter chips
├──────────────────────────────────────────────────────────────────────┤
│ [1]  Vaswani et al. (2017). Attention Is All You Need.        (Verified) │
│      Found · claim supported: "based solely on attention"              │
│ [7]  Mehta & Chen (2022). Graph Priors for Recall.           (Not found) │
│      No matching paper in live scholarly search                        │
│ [12] Rao (2019), cited for "cuts error by 40%"           (Not supported) │  ← expanded (Linen bg)
│   ┌ Evidence from the cited paper ────────────────────────────────────┐ │
│   │ "…our method cuts the error rate by **4%** relative to baseline…" │ │
│   │ Fetch API · arxiv.org/pdf/… · fetched 12:41                       │ │
│   │ [Fix claim to 4%] [Open source]                                    │ │
│   └────────────────────────────────────────────────────────────────────┘ │
│ [21] Iyer et al. (2018). Sensor Drift in IoT Nodes.          (Retracted) │
│      Retraction notice found on the publisher page                     │
└──────────────────────────────────────────────────────────────────────┘
```

**Header:** Plum bar, three dots (Cream, Periwinkle, Periwinkle), file name in Plex Mono, actions on the right (Cream pill buttons).
**Summary:** `N checked` bold; Periwinkle pill `V verified`; Plum pill `F flagged`; trust score right-aligned, animates count-up on completion. While running: show `Checking n/N` with progress bar and the live stage line ("Searching scholarly index for '…'").
**TinyFish meter:** small Plex Mono line with API badges and counts; tooltip explains each API.
**Rows:** `[n]` in Plex Mono (muted), title line bold (authors (year). Title.), reason line muted, status badge right. Hover → Linen. Click/Enter → expand.
**Evidence panel (expanded):**
- Section per check that ran: **Exists**, **Supports**, **Still valid**, **Current**, each with its verdict pill and API badge.
- Exists: canonical metadata vs cited, with a field-diff table (cited → actual) when mismatched; button **Use canonical metadata**.
- Supports: per claim: the claim text (with the disputed token highlighted), the verbatim **quote** in a white rounded box with an italic serif feel (still Inter Italic), mismatched numbers bold; source link; **Fix claim to X** if `suggestedFix`.
- Still valid: notice title, date, quote, link; "Checked by Agent API" badge if the agent ran.
- "What we searched" collapsible: queries + result counts (transparency).
- Fixed rows show a small `Fixed` Cream tag + **Undo**.
**Sorting:** default by `idx`; when a run completes, a toast offers "Show flagged first".
**Failure state:** run `failed` → Paper card with `[✗]` mark, error message, **Retry** button.

### 2.5 Grounded Answer `/app/ask`
- Big input "Ask anything — answered only from pages fetched seconds ago." + Ask button. Example chips (3 prompts).
- Status line streams (`Planning searches…` → `Searching news…` → `Reading 6 pages…` → `Writing answer…`).
- **Sources rail** (right on desktop, below on mobile): numbered cards: favicon, title, domain, published date, "fetched 12:41:07", API badge.
- **Answer**: sentences appear one by one; each `[n]` is a Periwinkle chip; hover/tap shows the supporting quote popover and highlights the source card.
- Footer: "2 sentences removed because their sources couldn't be verified." when `dropped > 0`. Copy button (markdown with links).

### 2.6 `/demo` and `/r/[shareId]`
Same Trust Report component in **read-only** mode (no fix buttons; export BibTeX allowed). Banner: "Sample report — sign in to check your own paper."

## 3. Component inventory (`apps/web/components`)

| Component | Notes |
|-----------|-------|
| `LogoMark`, `Logo` | SVG `currentColor`, sizes sm/md/lg |
| `StatusBadge` | props `status: CitationStatus`; label + icon per brand table |
| `VerdictPill` | per-check verdicts |
| `ApiBadge` | `search|fetch|agent` in Plex Mono |
| `TrustScore` | number + ring; bands with text label |
| `RunHeader` | title, actions, summary, progress, meter |
| `FilterChips` | counts from run.counts |
| `CitationRow` | collapsed row; keyboard accessible (`button` with `aria-expanded`) |
| `EvidencePanel` | sections per check |
| `QuoteBlock` | quote + highlight of differing tokens (diff numbers/words vs claim) |
| `FieldDiffTable` | cited vs actual |
| `Dropzone` | react-dropzone + signed upload |
| `AskBox`, `AnswerStream`, `SourceCard`, `CiteChip` | Grounded Answer |
| `CircleDecor` | decorative brand circles |
| `EmptyState`, `ErrorState` | with `[✗]` / circles |

## 4. States checklist (every data view)
Loading (skeleton rows in Paper) · Empty · Partial (running) · Complete · Error · Read-only.

## 5. Responsive rules
- ≥ 1024 px: report max-w 960 px centred; Ask uses 2 columns (answer 2/3, sources 1/3).
- < 640 px: header actions collapse into a `…` menu; filter chips scroll horizontally; evidence panel full-width; status badge moves under the title.

## 6. Accessibility
- Status always as text + icon. Focus ring Periwinkle 2 px. Rows are buttons with `aria-expanded`/`aria-controls`.
- Live region (`aria-live="polite"`) announces "Citation 12: not supported".
- Respect `prefers-reduced-motion`.
