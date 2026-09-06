# Farmacia de Guardia — Benalup-Casas Viejas

A tiny, mobile-first static website that shows which pharmacy is on duty **today** in Benalup-Casas Viejas (Cádiz). No build tools, no frameworks, no backend — just HTML, CSS and vanilla JavaScript.

## What it does

Open the page and it immediately shows:

- The name of today's on-duty pharmacy
- The type of duty shift (e.g. "Día y Noche (24 horas)", "SERVICIO NOCTURNO...")
- Its address and postal code
- A tap-to-call phone number
- A "Cómo llegar" link that opens the pharmacy's location in Google Maps
- Today's date

If the data can't be fetched, it falls back to the last successfully loaded result (cached on-device) or, failing that, shows the Colegio de Farmacéuticos de Cádiz's phone number and a link to their site.

## Files

| File            | Purpose                                                                 |
|-----------------|--------------------------------------------------------------------------|
| `index.html`    | Page structure: header, loading/result/error states, refresh button    |
| `style.css`     | Mobile-first styling; automatically adapts to light/dark mode          |
| `script.js`     | Fetches the data, filters for Benalup-Casas Viejas, renders the UI      |
| `manifest.json` | Web app manifest so the page can be installed to a phone's home screen |
| `icon.svg`      | App icon (green pharmacy cross), used as favicon and home-screen icon  |

## How it works

There's no backend. `script.js` fetches directly, client-side, from a public JSON endpoint used internally by the official Colegio de Farmacéuticos de Cádiz website:

```
GET https://www.cofcadiz.es/wp-json/vcomm/v1/farmacias/guardia?estilo=completo
```

This endpoint is a standard WordPress REST route exposed by the plugin that powers the "farmacias de guardia" search widget on [cofcadiz.es/farmacias-de-guardia](https://www.cofcadiz.es/farmacias-de-guardia/). A few notes on it, discovered by inspecting the official site:

- It requires no authentication or API key.
- It always returns **today's** date server-side — there is no way to query other days, which is fine here since this project only ever needs "today".
- It returns one entry per on-duty "guard zone" across the whole province of Cádiz (~68 zones). `script.js` filters this list down to whichever entry's `zona_guardia` or `municipio` contains `"BENALUP"` (matched case- and accent-insensitively, since the upstream data spells the zone `"BENALUP-CASA VIEJAS"` — note: no trailing "S" on "CASA").
- CORS is open (the response reflects `Access-Control-Allow-Origin` back to any request origin), which is what makes a pure static, backend-less site possible here.

Because this is an **undocumented, third-party endpoint** (not a published/versioned API), it could change or disappear without notice if the Colegio changes their site. That's why the app caches the last successful response in `localStorage` and shows a clear fallback (phone number + link to the official page) if a fetch ever fails or the data shape changes.

## Running it

No installation or build step needed.

- **Locally**: just open `index.html` in any browser.
- **On your phone**: host the folder anywhere static files can be served (see below), open it in a mobile browser, then use "Add to Home Screen" — the manifest and icon make it launch full-screen like an app.

### Serving it (optional)

Any static file host works, for example:

```bash
# quick local server for testing on a phone over the same network
npx serve .
```

Or deploy the folder as-is to GitHub Pages, Netlify, Vercel, Cloudflare Pages, etc. — there's nothing to configure or build.

## Design choices

- **Mobile-first, single column** — meant to be checked quickly on a phone, not browsed on desktop.
- **Dark-mode aware** — follows the OS/browser's `prefers-color-scheme` automatically.
- **Big tap targets** — the phone number and "Cómo llegar" link are large buttons, easy to tap one-handed.
- **Graceful degradation** — loading, success, stale-cache, and hard-error states are all handled explicitly so the page never shows a blank screen or a broken layout.

## Known limitations

- Relies on an unofficial/undocumented endpoint of a third-party WordPress site; if that site restructures its plugins, the endpoint URL or response shape could change and break this app until updated.
- Only shows *today's* duty pharmacy — there's no calendar or lookup for other dates or other towns (by design, per the project's scope).
- No automated tests; correctness was verified manually against the live API and cross-checked with the official page.
