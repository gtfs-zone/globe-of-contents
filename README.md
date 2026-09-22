# globe-of-contents

A list and a world map of every public GTFS and GTFS Realtime feed, and whether
each one still answers. Deployed at `list.gtfs.zone`.

A static Vite/TypeScript/daisyUI app with no backend of its own. Everything it
shows comes from the artifacts
[geometry-car](https://git.kcfam.us/gtfs.zone/geometry-car) publishes daily to
`data.gtfs.zone`: `manifest.json` first, then `sources.json`, `status.json` and
`summary.json` at the hashes the manifest names.

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

- **The list:** every source row, one per catalog and kind (a feed with a
  schedule and a realtime endpoint is two rows). Search plus filters for
  catalog, status, kind and country, all mirrored into the URL hash so a
  filtered view is a link. At most 200 rows are painted; the count says how many
  more match.
- **The map:** the placed rows among the current filter, clustered, each cluster
  ringed by its up/down/unchecked share. Most rows have no coordinates (DMFR
  carries none; only the Mobility Database does), and the map says how many it
  is not drawing.
- **A row:** every URL, the last check's result, when it last changed state,
  and the rows in other catalogs pointing at the same endpoint.

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
