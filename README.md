# globe-of-contents

A list and a world map of every public GTFS and GTFS Realtime feed, and whether
each one still answers. Deployed at `list.gtfs.zone`.

A static Vite/TypeScript/daisyUI app with no backend of its own. Everything it
shows comes from the artifacts
[geometry-car](https://git.kcfam.us/gtfs.zone/geometry-car) publishes daily to
`data.gtfs.zone`: `manifest.json` first, then `feeds.json`, `sources.json`,
`status.json` and `summary.json` at the hashes the manifest names.

```bash
pnpm install
pnpm dev          # vite on :8080, reading https://data.gtfs.zone
pnpm typecheck
pnpm build

git config core.hooksPath .githooks   # once per clone; typecheck on commit
```

`VITE_DATA_BASE=<url> pnpm dev` points the dev server at another copy of the
artifacts. Production always reads `https://data.gtfs.zone`.

## What it shows

- **The map:** one point per logical feed (a transit system, bundling its
  schedule and realtime across every catalog that lists it), clustered, each
  cluster ringed by its up/down/unchecked share. Many feeds have no coordinates
  (DMFR carries none; only the Mobility Database does), and the map always says
  how many it is not drawing.
- **Search:** the box on the map narrows the list and the map as you type and
  offers the best matches in a dropdown. The state counts at the top of the list
  and a "realtime only" switch under them filter it. All of it is mirrored into the URL hash, so a
  filtered view is a link.
- **The sidebar,** hash-routed with breadcrumbs:
  - Home: the filtered feeds. At most 200 are painted; the count says how many
    more match.
  - Feed: each role's state and URLs, the schedule's size and Last-Modified,
    the catalog entries it was built from, and links into the editor and the
    visualizer.
  - Source: one catalog entry, its URLs and its last check.
- **Phone:** the sidebar becomes a bottom drawer, opened from the dock's Browse
  button.

## Releasing

```bash
cz bump        # on main; tags vX.Y.Z
git push origin main --tags
git push github main --tags
```

CI builds on the tag, pushes the image by digest and records that digest in
`deploy-gtfs-rt/sites/kustomization.yaml`; ArgoCD rolls it out.

## License

AGPL-3.0, see `LICENSE.txt`.
