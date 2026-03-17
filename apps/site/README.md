# fedzx.com Static Site (CMS-driven)

This folder keeps the existing frontend layout and swaps the 4 homepage sections with CMS-driven content.

## How It Works

- `js/cms-loader.js` fetches published modules from `GET {CMS_BASE}/api/public/pages/home`.
- Each module's `config` is expected to be JSON: `{ "html": "<section inner html...>" }`.
- It injects the HTML into the existing section containers:
  - `hero` -> `#home`
  - `services` -> `#services`
  - `analysis` -> `#analysis`
  - `assets` -> `#assets`
- After injection, it calls `window.fedzxReinit()` to re-bind UI behaviors.
- For local preview, relative image paths like `images/foo.jpg` are rewritten to `{ASSET_BASE}/images/foo.jpg`.

## Configure CMS Base URL

Set a meta tag in `index.html`:

`<meta name="fedzx-cms-base" content="https://cms.your-domain.com" />`

If omitted, it uses the current origin.

## Configure Asset Base (Optional)

If your CMS-provided HTML contains relative asset paths (e.g. `images/*.jpg`), set:

`<meta name="fedzx-asset-base" content="https://fedzx.com" />`
