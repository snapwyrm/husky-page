# husky-page

The portfolio at **[husky.snapwyrm.com](https://husky.snapwyrm.com)**.

One self-contained `index.html`. No frameworks, no build step. The only network
request the page ever makes is same-origin: `/api/contributions`. Design tokens
(colors, radii, shadows, gradients, motion) are lifted from the snapwyrm.com
stylesheet so this page reads as part of the same brand.

## Files

| file | what it is |
| --- | --- |
| `public/index.html` | the entire site: HTML + CSS + JS inline |
| `public/og.png` | 1200x630 social unfurl card, requested by crawlers only |
| `public/assets/mascot/` | the mascot's 17 expression frames (512px webp, ~476KB total, lazy-loaded) |
| `public/assets/fonts/` | Bricolage Grotesque, latin-subset variable woff2 (47KB, SIL OFL, `opsz` + `wght` live) |
| `public/assets/work/` | product imagery for the work grid (webp) |
| `worker.js` | serves the site + /api/contributions (GitHub calendar proxy, 6h edge cache) |
| `wrangler.toml` | Workers-assets config; pins the compatibility date |

## Type

One self-hosted display face, same-origin, no CDN. Headings use `--font-display`
(Bricolage); body and UI stay on the system stack; `--font-mono` is the system
mono and carries every machine reading (hashes, prices, timers, section
counters, the heatmap axes). Two metric-overridden fallback `@font-face` rules
match Bricolage's x-height and ascent, so the swap costs **zero layout shift**,
which matters because `.hero h1 .l` is an `overflow:hidden` mask whose clipping
box depends on the ascent.

To re-subset after a font update:

```bash
python -m fontTools.subset Bricolage.ttf --output-file=bricolage-display.woff2 --flavor=woff2 --layout-features='kern,liga,calt,case' --unicodes="U+0020-007E,U+00B7,U+00D7,U+2013,U+2018-201A,U+201C-201E,U+2026,U+2192" --no-hinting
```

## The mascot

The husky-demon in the hero is a full rig (design: Husky). Idle machine (blinks,
winks, the occasional glitch), hover grins, click for a treat. Spam-clicking
climbs a 7-tier rage ladder that ends with him taking the whole site (the
blacksite). Escape key or the flickering button brings the light back. Audio
only ever starts after you touch him; reduced-motion gets a calm husky with no
ladder. Frames beyond the idle set load on the first press.

## How the page is built

An enhancement ladder. Every rung degrades to the one below it:

1. Static dark page: full content, CSS-gradient nebula, star sprinkle (no-JS / reduced-motion)
2. Scroll choreography: native CSS `animation-timeline: view()` where supported, IntersectionObserver fallback
3. Canvas 2D starfield + the wyrm (a segment-chain glow creature in the deep layer)
4. WebGL nebula shader (fbm + domain warp, half-res, dithered)

A frame-time governor watches p90 frame time and steps the ladder back down on
slow devices, logging what it did to the console. Nothing on the page depends on
a timeline to become visible: held intro/hero states are stripped by timers, so
a paused tab or a dead script can never hide content.

Also in here: a Ctrl+K command palette (native `<dialog>`), a playable brand-skinned
Minesweeper (palette, or triple-click the nav mark), a couple of easter eggs worth
finding, and a footer seed commitment your browser re-verifies with SubtleCrypto.

## Editing

Open `index.html` and edit it. That is the whole workflow.

Local dev (serves the worker and the assets):

```bash
npx wrangler dev
```

For the contributions API locally, put a GitHub token in `.dev.vars`
(`GITHUB_TOKEN=...`). That file is gitignored; never commit it.

## Deploys

Cloudflare Pages, Git-connected: every push to `main` deploys. There is no build
command; Pages serves the repo root, and `functions/` deploys automatically.

Production needs one secret: `GITHUB_TOKEN` (Pages project → Settings →
Variables and secrets), a read-only token used by `/api/contributions` to fetch
the owner's contribution calendar, private-repo activity included as day-counts
only. Without the secret the endpoint returns 503 and the page falls back to a
baked snapshot; below 100 contributions/year the section hides itself entirely.

## Ground rules for future edits

- Everything stated on the page has to be true and, where possible, clickable.
  No invented stats, client counts, testimonials, or years of experience.
- No em dashes anywhere, in copy or in comments.
- Animate transform and opacity only, and never on a loop that runs forever.
  `filter` and `background-position` are repaints: if something must pulse,
  pulse the opacity of a pseudo-element instead. `prefers-reduced-motion` stays
  honest: loops freeze, the atmosphere goes static, function keeps working.
- Scroll reveals animate `translate`, never `transform`. They are independent
  properties that compose, so an element can be mid-reveal and still take a
  hover lift. Using `transform` silently kills every `:hover` transform on the
  element, and no fill-mode setting fixes it.
- Stagger inside a scroll-driven animation lives in `animation-range`, not in
  `transition-delay`, which does nothing on a scrubbed timeline.
- Width comes from the three bands (`content` / `b-wide` / `b-full`), spacing
  from `--s1..--s8`, type from `--fs-*`, surfaces from `--e0..--e4` with their
  paired `--rim-*` and `--sh-*`. If a value looks arbitrary, it is a bug.
- Content must survive no-JS, paused timelines, and a dead script. The pretty
  layers are decoration on top of a page that already works.
