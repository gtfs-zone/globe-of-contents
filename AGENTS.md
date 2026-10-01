# AGENTS.md

`list.gtfs.zone`: a list and world map of every public GTFS feed (Transitland
Atlas, Mobility Database, curated examples), merged into logical feeds with their
reachability. Read-only, no backend: the data is feed-catalog's artifacts at
`https://data.gtfs.zone`. A `v*` tag builds the image and commits its digest
into `gtfs-zone-infra/sites`.

## Architecture

Every magic number and URL is in `CONFIG` in `src/config.ts`. Artifact types and
`CatalogueIndex` are in `src/data/artifacts.ts`; pages, filters and the map are
in `src/modules/`.

- **Artifacts are never served from this origin.** `nginx.conf` caches `.json`
  as immutable for a year; do not move them into `public/`.
- **Artifact shapes belong to feed-catalog.** `src/data/artifacts.ts` mirrors
  `gtfs_zone_feed_catalog/artifacts.py`; a field change starts there.
- **Feed pages are for crawlers.** `/feed/<id>/<slug>` is `index.html` plus
  feed-catalog's `pages/feed/<id>/{head,body}.html` included by nginx SSI;
  `nginx.conf` is an envsubst template (`PAGES_UPSTREAM`). The app still routes
  on the hash; `src/boot-path.ts` converts on load.
- **First paint is `search.json`.** `feeds.json`, `sources.json` and
  `status.json` load behind it and `CatalogueIndex.attachDetail` merges them
  in. Anything reading `members` checks `hasDetail`.
- **Feeds, not rows.** List, map and search are over feeds; `sources.json` rows
  only appear as members and on their Source page. Never regroup them here.
- **Unplaced feeds are counted, never hidden.** Home says how many listed feeds
  are not on the map.
- **Every focus change goes through `appState.setFocus`.** The sidebar and the
  camera react to `onFocusChange`, not to each other.
- **State split**: filters (`q`, `status`, `rt`) in Home's hash; a Feed or Source
  hash carries only the page. Map view, basemap and last filters go in
  localStorage under `gc.`-prefixed keys; `theme` stays un-prefixed and shared
  across gtfs.zone sites. `near` sort is in memory only.
- Feed states, role labels and search matching come from gtfs-zone-web-common's
  `gtfs/feed-catalog`, `gtfs/feed-badges` and `gtfs/feed-search`.
- Cluster counts are HTML markers: the shared raster basemaps have no `glyphs`
  URL, so a symbol layer cannot draw text.

### Shared modules (`gtfs-zone-web-common`)

A pinned git dependency shipping raw TypeScript. Wiring it takes four edits, each
failing differently if missed: `tsconfig.json` `paths`, the `vite.config.ts`
alias plus `optimizeDeps.exclude`, the Tailwind `@source` in
`src/styles/main.css`, and the `app-shell.css` `@import` right after
`@import 'tailwindcss'`. Restart the dev server after a bump: Vite does not
watch `node_modules` (a stale copy logs `loaded twice`).

## Conventions

- **Commits**: Conventional Commits, enforced by the `commit-msg` hook. Never add
  Co-Authored-By trailers. Setup and release are in [CONTRIBUTING.md](CONTRIBUTING.md).
- **Verification**: no Playwright or other browser automation. Stop at
  `pnpm typecheck` / `pnpm build` and hand off; the user checks in the browser.
- **Plans**: write plans to `CURRENT_PLAN.md` at the repo root as a
  checklist (`- [ ]`), ticked off as work lands. It is neither tracked nor
  gitignored: never stage or commit it.
