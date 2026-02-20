# Image Archive — Conceptual Network

An interactive idea web: image nodes connected by theme and mood, with parallax, hover, and drag.

## Run

Open `index.html` in a browser, or serve the folder locally (e.g. `npx serve .`) so `data.json` loads correctly.

## Adding nodes

1. **Edit `data.json`** — add an object to the `nodes` array:
   - `id`: unique string (e.g. `"vapourware_03"`)
   - `image`: path to the image (e.g. `"Week1ImageAssets/yourfile.jpg"`)
   - `source`: URL opened when the node is clicked
   - `themes`: array of strings, e.g. `["vapourware", "illustration"]`
   - `moods`: array of strings, e.g. `["nostalgic", "space"]`

2. **Connections** — Two nodes are linked if they share at least one **theme** or one **mood**. No code change needed when you add new theme/mood strings; just use them in your nodes.

3. **Theme filter** — To add a new filter button, add a button in `index.html` with `data-theme="your theme"` and ensure the same string appears in your nodes’ `themes` arrays.

## Folder structure

- `index.html` — Page and graph container
- `styles.css` — Layout and node/link styles
- `script.js` — D3 force simulation, links, hover, drag, parallax
- `data.json` — Node list and optional `meta` (themes/moods reference)
- `Week1ImageAssets/` — Your image files (or use an `images/` folder and update paths in `data.json`)

## Tech

HTML, CSS, vanilla JavaScript, D3.js v7 (force simulation and SVG). No frameworks.
