/**
 * The world map: every placed logical feed in the current filter, clustered,
 * and coloured by whether it answered.
 *
 * Clusters are HTML markers rather than a symbol layer, because none of the
 * shared raster basemaps carries a glyphs URL and so a map layer cannot draw a
 * count. Each marker's ring is split by the cluster's up/down/unchecked share,
 * which is the zoomed-out view of the whole world's reachability.
 *
 * Unplaced feeds are not drawn at all. The caller shows their count beside
 * the map, since much of the corpus has no coordinates and a map that quietly
 * dropped them would mislead.
 */

import maplibregl from 'maplibre-gl';
import type {
  GeoJSONSource,
  LngLatBoundsLike,
  Map as MapLibreMap,
  MapLayerMouseEvent,
  MapMouseEvent,
} from 'maplibre-gl';
import type { Feature, FeatureCollection, Point, Polygon } from 'geojson';
import { AutoZoom } from 'interlocking/map/auto-zoom';
import { BasemapControl, initialMapStyle } from 'interlocking/map/basemap-control';
import type { MapAppearance } from 'interlocking/map/basemap-control';
import { clearThemeColorCache, resolveThemeColor } from 'interlocking/util/theme-color';
import { escapeHtml } from 'interlocking/util/escape-html';
import { CONFIG } from '../config';
import type { Feed, Place, State } from '../data/artifacts';
import { STATE_LABELS } from './labels';
import { readStored, writeStored } from './storage';

interface MapView {
  center: [number, number];
  zoom: number;
}

interface PointProps {
  id: string;
  name: string;
  state: State;
}

const SOURCE_ID = 'feeds';
const POINT_LAYER = 'feed-points';
const SELECTED_SOURCE = 'selected';
const SELECTED_FILL = 'selected-bbox-fill';
const SELECTED_LINE = 'selected-bbox-line';
const SELECTED_POINT = 'selected-point';

const EMPTY: FeatureCollection<Point, PointProps> = { type: 'FeatureCollection', features: [] };

function restoreView(): MapView {
  const stored = readStored<MapView>(CONFIG.MAP_VIEW_KEY);
  if (
    !stored ||
    !Array.isArray(stored.center) ||
    stored.center.length !== 2 ||
    !stored.center.every(Number.isFinite) ||
    typeof stored.zoom !== 'number'
  ) {
    return { center: CONFIG.DEFAULT_CENTER, zoom: CONFIG.DEFAULT_ZOOM };
  }
  return { center: stored.center as [number, number], zoom: stored.zoom };
}

function abbreviate(n: number): string {
  return n >= 10_000 ? `${Math.round(n / 1000)}k` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

export class GlobeMap {
  private map: MapLibreMap;
  private autoZoom: AutoZoom;
  private data: FeatureCollection<Point, PointProps> = EMPTY;
  private selected: Place | null = null;
  private colors: Record<State, string> = { ...CONFIG.STATE_COLOR_FALLBACK };
  // Cluster ids are only stable for one setData, so both maps are cleared
  // whenever the data changes.
  private markers = new Map<number, maplibregl.Marker>();
  private onScreen = new Map<number, maplibregl.Marker>();
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private hover: maplibregl.Popup;

  /** Fired by a click on the map that hits no feed. */
  onEmptyClick: (() => void) | null = null;

  constructor(container: string, onSelect: (feedId: string) => void) {
    const view = restoreView();
    const appearance = readStored<MapAppearance>(CONFIG.MAP_APPEARANCE_KEY) ?? {};

    this.map = new maplibregl.Map({
      container,
      style: initialMapStyle(appearance),
      center: view.center,
      zoom: view.zoom,
      attributionControl: { compact: true },
    });
    this.map.addControl(new maplibregl.NavigationControl(), 'bottom-left');
    new BasemapControl(this.map, {
      initial: appearance,
      onAppearanceChange: (next) => writeStored(CONFIG.MAP_APPEARANCE_KEY, next),
    });

    this.autoZoom = new AutoZoom(() => this.focusSelected());
    this.hover = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 8 });

    this.resolveColors();
    this.map.once('load', () => this.installLayers());
    // setStyle drops every source and layer this class added.
    this.map.on('basemap:changed', () => this.installLayers());
    this.map.on('render', () => this.updateClusterMarkers());
    this.map.on('moveend', () => this.queueViewSave());

    this.map.on('click', (e: MapMouseEvent) => {
      const hit = this.map.getLayer(POINT_LAYER)
        ? this.map.queryRenderedFeatures(e.point, { layers: [POINT_LAYER] })[0]
        : undefined;
      const id = hit?.properties?.id;
      if (typeof id === 'string') {
        onSelect(id);
      } else {
        this.onEmptyClick?.();
      }
    });
    this.map.on('mousemove', POINT_LAYER, (e: MapLayerMouseEvent) => {
      const feature = e.features?.[0];
      if (!feature) {
        return;
      }
      this.map.getCanvas().style.cursor = 'pointer';
      const { name, state } = feature.properties as PointProps;
      this.hover
        .setLngLat((feature.geometry as Point).coordinates as [number, number])
        .setHTML(
          `<div class="text-sm font-medium text-black">${escapeHtml(name)}</div>` +
            `<div class="text-xs text-black/60">${STATE_LABELS[state]}</div>`
        )
        .addTo(this.map);
    });
    this.map.on('mouseleave', POINT_LAYER, () => {
      this.map.getCanvas().style.cursor = '';
      this.hover.remove();
    });
  }

  getAutoZoom(): AutoZoom {
    return this.autoZoom;
  }

  /** Replace what is drawn with the placed feeds among `feeds`. */
  setFeeds(feeds: Feed[]): void {
    const features: Feature<Point, PointProps>[] = [];
    for (const feed of feeds) {
      if (feed.lat === undefined || feed.lon === undefined) {
        continue;
      }
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [feed.lon, feed.lat] },
        properties: { id: feed.feedId, name: feed.name || feed.feedId, state: feed.state },
      });
    }
    this.data = { type: 'FeatureCollection', features };
    this.clearClusterMarkers();
    (this.map.getSource(SOURCE_ID) as GeoJSONSource | undefined)?.setData(this.data);
  }

  /** Highlight a place, and move the camera to it if auto-zoom allows. */
  select(place: Place | null): void {
    this.selected = place;
    this.paintSelected();
    this.focusSelected();
  }

  /**
   * Keep the camera's focus clear of the mobile sheet, which covers the
   * bottom `covered` pixels of the map.
   */
  setBottomPadding(covered: number): void {
    this.map.setPadding({ top: 0, left: 0, right: 0, bottom: covered });
  }

  /** A cheap resize, while the sidebar is being dragged. */
  resizeNow(): void {
    this.map.resize();
  }

  /** The resize once the sidebar is released. */
  forceMapResize(): void {
    this.map.resize();
    this.map.triggerRepaint();
  }

  onThemeChange(): void {
    clearThemeColorCache();
    this.resolveColors();
    if (this.map.getLayer(POINT_LAYER)) {
      this.map.setPaintProperty(POINT_LAYER, 'circle-color', this.stateColorExpression());
    }
    this.clearClusterMarkers();
    this.map.triggerRepaint();
  }

  private resolveColors(): void {
    this.colors = {
      up: resolveThemeColor('--color-success', CONFIG.STATE_COLOR_FALLBACK.up),
      down: resolveThemeColor('--color-error', CONFIG.STATE_COLOR_FALLBACK.down),
      unknown: CONFIG.STATE_COLOR_FALLBACK.unknown,
    };
  }

  private stateColorExpression(): maplibregl.ExpressionSpecification {
    return [
      'match',
      ['get', 'state'],
      'up',
      this.colors.up,
      'down',
      this.colors.down,
      this.colors.unknown,
    ];
  }

  private installLayers(): void {
    if (this.map.getSource(SOURCE_ID)) {
      return;
    }
    this.clearClusterMarkers();

    this.map.addSource(SOURCE_ID, {
      type: 'geojson',
      data: this.data,
      cluster: true,
      clusterRadius: CONFIG.CLUSTER_RADIUS,
      clusterMaxZoom: CONFIG.CLUSTER_MAX_ZOOM,
      clusterProperties: {
        up: ['+', ['case', ['==', ['get', 'state'], 'up'], 1, 0]],
        down: ['+', ['case', ['==', ['get', 'state'], 'down'], 1, 0]],
      },
    });
    this.map.addLayer({
      id: POINT_LAYER,
      type: 'circle',
      source: SOURCE_ID,
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': this.stateColorExpression(),
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 2, 4, 10, 7],
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 1.5,
      },
    });

    this.map.addSource(SELECTED_SOURCE, { type: 'geojson', data: this.selectedData() });
    this.map.addLayer({
      id: SELECTED_FILL,
      type: 'fill',
      source: SELECTED_SOURCE,
      filter: ['==', ['geometry-type'], 'Polygon'],
      paint: { 'fill-color': '#3b82f6', 'fill-opacity': 0.08 },
    });
    this.map.addLayer({
      id: SELECTED_LINE,
      type: 'line',
      source: SELECTED_SOURCE,
      filter: ['==', ['geometry-type'], 'Polygon'],
      paint: { 'line-color': '#3b82f6', 'line-width': 2, 'line-dasharray': [2, 1] },
    });
    this.map.addLayer({
      id: SELECTED_POINT,
      type: 'circle',
      source: SELECTED_SOURCE,
      filter: ['==', ['geometry-type'], 'Point'],
      paint: {
        'circle-color': 'rgba(0,0,0,0)',
        'circle-radius': 11,
        'circle-stroke-color': '#3b82f6',
        'circle-stroke-width': 3,
      },
    });
  }

  private selectedData(): FeatureCollection {
    const place = this.selected;
    const features: Feature[] = [];
    if (place?.bbox) {
      const [minLat, minLon, maxLat, maxLon] = place.bbox;
      const ring = [
        [minLon, minLat],
        [maxLon, minLat],
        [maxLon, maxLat],
        [minLon, maxLat],
        [minLon, minLat],
      ];
      features.push({
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [ring] } as Polygon,
        properties: {},
      });
    }
    if (place?.lat !== undefined && place.lon !== undefined) {
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [place.lon, place.lat] },
        properties: {},
      });
    }
    return { type: 'FeatureCollection', features };
  }

  private paintSelected(): void {
    (this.map.getSource(SELECTED_SOURCE) as GeoJSONSource | undefined)?.setData(this.selectedData());
  }

  private focusSelected(): void {
    const place = this.selected;
    if (!place || place.lat === undefined || place.lon === undefined) {
      return;
    }
    // A box crossing the antimeridian has min_lon > max_lon; flying to the
    // centroid is better than a fit that spans the rest of the world.
    if (place.bbox && place.bbox[1] <= place.bbox[3]) {
      const [minLat, minLon, maxLat, maxLon] = place.bbox;
      const bounds: LngLatBoundsLike = [
        [minLon, minLat],
        [maxLon, maxLat],
      ];
      this.autoZoom.fitBounds(this.map, new maplibregl.LngLatBounds(bounds), {
        padding: 60,
        maxZoom: CONFIG.FEED_FOCUS_ZOOM + 3,
        duration: CONFIG.FOCUS_DURATION,
        essential: true,
      });
      return;
    }
    this.autoZoom.flyTo(this.map, {
      center: [place.lon, place.lat],
      zoom: Math.max(this.map.getZoom(), CONFIG.FEED_FOCUS_ZOOM),
      duration: CONFIG.FOCUS_DURATION,
      essential: true,
    });
  }

  private clearClusterMarkers(): void {
    for (const marker of this.onScreen.values()) {
      marker.remove();
    }
    this.onScreen.clear();
    this.markers.clear();
  }

  private clusterElement(id: number, lngLat: [number, number], props: Record<string, number>): HTMLElement {
    const total = props.point_count;
    const up = props.up ?? 0;
    const down = props.down ?? 0;
    const upEnd = (up / total) * 360;
    const downEnd = upEnd + (down / total) * 360;
    const size = Math.round(26 + Math.min(Math.log10(total), 4) * 9);

    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'cluster-marker';
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.background =
      `conic-gradient(${this.colors.up} 0deg ${upEnd}deg, ` +
      `${this.colors.down} ${upEnd}deg ${downEnd}deg, ` +
      `${this.colors.unknown} ${downEnd}deg 360deg)`;
    el.title = `${total} feeds: ${up} up, ${down} down, ${total - up - down} not checked`;
    el.innerHTML = `<span>${abbreviate(total)}</span>`;
    el.addEventListener('click', (event) => {
      event.stopPropagation();
      const source = this.map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
      void source?.getClusterExpansionZoom(id).then((zoom) => {
        this.map.easeTo({ center: lngLat, zoom });
      });
    });
    return el;
  }

  private updateClusterMarkers(): void {
    if (!this.map.getSource(SOURCE_ID) || !this.map.isSourceLoaded(SOURCE_ID)) {
      return;
    }
    const next = new Map<number, maplibregl.Marker>();
    for (const feature of this.map.querySourceFeatures(SOURCE_ID)) {
      const props = feature.properties as Record<string, number> | null;
      if (!props?.cluster) {
        continue;
      }
      const id = props.cluster_id;
      if (next.has(id)) {
        continue; // the same cluster, repeated across tile edges
      }
      let marker = this.markers.get(id);
      if (!marker) {
        const lngLat = (feature.geometry as Point).coordinates as [number, number];
        marker = new maplibregl.Marker({ element: this.clusterElement(id, lngLat, props) }).setLngLat(lngLat);
        this.markers.set(id, marker);
      }
      if (!this.onScreen.has(id)) {
        marker.addTo(this.map);
      }
      next.set(id, marker);
    }
    for (const [id, marker] of this.onScreen) {
      if (!next.has(id)) {
        marker.remove();
      }
    }
    this.onScreen = next;
  }

  private queueViewSave(): void {
    if (this.saveTimer !== null) {
      clearTimeout(this.saveTimer);
    }
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      const center = this.map.getCenter();
      writeStored(CONFIG.MAP_VIEW_KEY, { center: [center.lng, center.lat], zoom: this.map.getZoom() });
    }, CONFIG.MAP_VIEW_SAVE_DEBOUNCE);
  }
}
