# husky-page

The portfolio at **[husky.snapwyrm.com](https://husky.snapwyrm.com)**.

One self-contained `index.html`. No frameworks, no build step, no external requests.
Design tokens (colors, radii, shadows, gradients, motion) are lifted from the
snapwyrm.com stylesheet so this page reads as part of the same brand.

## Files

| file | what it is |
| --- | --- |
| `index.html` | the entire site, HTML + CSS + JS inline |
| `og.png` | 1200x630 social unfurl card, requested by crawlers only, never by the page |

## Editing

Open `index.html` and edit it. That is the whole workflow.

To preview locally:

```bash
python -m http.server 8123
```

Then visit `http://127.0.0.1:8123`. Use a server rather than opening the file
directly: the footer seed commitment uses `crypto.subtle`, which browsers only
expose on a secure origin (https or localhost). Over `file://` the seal hides
itself instead of showing something broken.

## Deploys

Cloudflare Pages, Git-connected. Every push to `main` builds and deploys.
There is no build command and no output directory to configure, Pages serves
the repo root as-is.

## Ground rules for future edits

- Everything stated on the page has to be true and, where possible, clickable.
  No invented stats, client counts, testimonials, or years of experience.
- No em dashes anywhere, in copy or in comments.
- Animate transform and opacity only, and keep `prefers-reduced-motion` honest.
- Content must stay visible without JavaScript. The reveal effect is layered on
  top via the `js` class on `<html>`, never required to read the page.
