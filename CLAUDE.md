# CLAUDE.md

## Project Overview

`list.gtfs.zone`: a list and a world map of every public GTFS feed in the
Transitland Atlas, the Mobility Database and the curated examples, merged into
logical feeds, with each one's reachability. Read-only; no backend. The data is geometry-car's published
artifacts at `https://data.gtfs.zone`.

## Commands

```bash
pnpm dev
pnpm typecheck    # the gate before any commit
pnpm build

git config core.hooksPath .githooks   # once per clone; runs typecheck pre-commit
```

## Layout

```
src/shell.ts               mounts interlocking's app shell and sets up its search box
src/config.ts              every magic number and URL, one frozen CONFIG
src/data/artifacts.ts      artifact types (mirroring geometry-car's artifacts.py), the fetch, CatalogueIndex
src/types/page-state.ts    home | feed | source, and their hash codec
src/modules/app-state.ts   FocusController: page half of the hash, filter half replaced in place
src/modules/filters.ts     filter state, URL hash, localStorage, uFuzzy matching over feeds
src/modules/pages.ts       the sidebar's Home, Feed and Source pages and their breadcrumbs
src/modules/map-view.ts    MapLibre, clustered source, HTML cluster markers
src/modules/help-pages.ts  the Guide's pages
```

## Rules

- **The artifacts are never served from this origin.** `nginx.conf` caches
  `.json` as immutable for a year, which is right for fingerprinted assets and
  wrong for data that refreshes daily. Do not move them into `public/`.
- **The artifact shapes belong to geometry-car.** `src/data/artifacts.ts`
  mirrors `geometry_car/artifacts.py`; a field change starts there.
- **Unplaced feeds are counted, never hidden.** Much of the corpus has no
  coordinates. The Home list says how many of the feeds it lists are not on
  the map.
- **Feeds, not rows.** The list, the map and the search are over `feeds.json`.
  `sources.json` rows only appear as a feed's members and on their own Source
  page; the feed-to-row grouping is geometry-car's, never recomputed here.
- **Every focus change goes through `appState.setFocus`:** list links, map
  clicks, search picks and breadcrumbs alike. The sidebar and the camera react
  to `onFocusChange`, not to each other.
- **State split:** filters (`q`, `status`, `rt`) go in Home's URL hash, and a
  Feed or Source hash carries only the page (`feed=` or `source=`); map view, basemap
  and last filters go in localStorage under `gc.`-prefixed keys. The `theme` key stays un-prefixed and shared, so
  the moon toggle agrees across every gtfs.zone site.
- Cluster counts are HTML markers, not a symbol layer: the shared raster
  basemaps have no `glyphs` URL, so a map layer cannot draw text.
- Do NOT use Playwright (or any browser automation) to verify changes. The user
  does visual/browser verification themselves. Stop at `pnpm typecheck` /
  `pnpm build` and hand off.
- Never include `Co-Authored-By: Claude ...` trailers in commit messages.

## Shared modules (`interlocking`)

Pinned git dependency shipping raw TypeScript. Adding it takes four edits and
missing any one fails in a different place: the `tsconfig.json` `paths` entry,
the `vite.config.ts` alias plus `optimizeDeps.exclude`, the Tailwind `@source`
line in `src/styles/main.css`, and the `app-shell.css` `@import` directly after
`@import 'tailwindcss'` in the same file. After bumping the pin, restart the dev
server: Vite does not watch `node_modules`, and `util/module-state` logs
`loaded twice` when a stale copy is still cached.

## Releasing

`cz bump` on main, then push commits and tags to **both** remotes (`origin` on
git.kcfam.us, `github`). The tag triggers `.forgejo/workflows/build.yml`, which
builds, pushes by digest and commits the digest into `deploy-gtfs-rt/sites`.

## Related Repos

| Repo | Description | URL |
|---|---|---|
| geometry-car | Dagster pipeline publishing the artifacts this app reads | https://git.kcfam.us/gtfs.zone/geometry-car |
| interlocking | Shared browser-side library | https://git.kcfam.us/gtfs.zone/interlocking |
| coloring-book | Schedule editor, edit.gtfs.zone | https://git.kcfam.us/gtfs.zone/coloring-book |
| test-track | Realtime visualizer, viz.rt.gtfs.zone | https://git.kcfam.us/gtfs.zone/test-track |
| deploy-gtfs-rt | k3s + ArgoCD deploy repo | https://git.kcfam.us/gtfs.zone/deploy-gtfs-rt |
