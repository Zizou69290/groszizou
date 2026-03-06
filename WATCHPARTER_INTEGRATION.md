# Watch Parter Integration Notes

## Current architecture

- `watch-parter.html`: hub page (entry point from the main nav dropdown).
- `watch-parter-watchlist.html`
- `watch-parter-courter.html`
- `watch-parter-duel.html`
- `watch-parter-bingo.html`

The four feature pages share the same app shell and only differ by:

- `data-watch-parter-mode` (`watchlist`, `courter`, `duel`, `bingo`)

## Shared scripts

- `assets/js/watch-parter-nav.js`
  - Handles mobile menu toggle and active menu state.
- `assets/js/watch-parter-shell.js`
  - Renders the Watch Parter app markup into `#watchparter-app-root`.
- `assets/js/watch-parter-mode-init.js`
  - Applies the requested mode based on `data-watch-parter-mode`.

## Watch Parter source folder

`watch-parter-source/` intentionally keeps only the files needed by the integrated pages:

- `script.js`
- `style.css`
- `wg.otf`
- `antho.png`, `claire.png`, `nico.png`
- `bingo1.gif` ... `bingo5.gif`

Legacy standalone pages/deploy artifacts were removed on purpose.

## Auth and user identity

- Header auth on Watch Parter pages uses the same Super Site stack:
  - `assets/js/reviews.js`
  - `assets/js/auth-ui.js`
- Watch Parter actions now use the connected Super Site username via `window.ReviewsStore.getCurrentUser()`.
- The old `T KI ?` selector is removed.

## API routes used by Watch Parter

- `api/discord-share.js`
- `api/image-proxy.js`

Environment variable required for Discord share:

- `DISCORD_WEBHOOK_URL` (documented in `.env.example`)

