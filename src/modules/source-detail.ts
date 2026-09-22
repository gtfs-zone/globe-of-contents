/**
 * One source in full: where it came from, every URL it names, what the last
 * check saw, and the rows in other catalogs pointing at the same endpoint.
 */

import { showModal } from 'interlocking/ui/modal-utils';
import { escapeHtml } from 'interlocking/util/escape-html';
import { CONFIG } from '../config';
import type { SourceRow, StatusEntry } from '../data/artifacts';
import { stateOf } from '../data/artifacts';
import {
  CATALOG_LABELS,
  KIND_LABELS,
  STATE_BADGE,
  STATE_LABELS,
  formatDate,
  placeLine,
  statusLine,
} from './labels';

const URL_FIELDS: [keyof SourceRow, string][] = [
  ['scheduledUrl', 'Schedule'],
  ['vehiclesUrl', 'Vehicle positions'],
  ['tripUpdatesUrl', 'Trip updates'],
  ['alertsUrl', 'Service alerts'],
];

function field(label: string, value: string): string {
  return value
    ? `<tr><th class="font-normal opacity-60 align-top whitespace-nowrap pr-4">${label}</th><td class="break-all">${value}</td></tr>`
    : '';
}

function link(url: string): string {
  const safe = escapeHtml(url);
  return /^https?:\/\//.test(url)
    ? `<a class="link" href="${safe}" target="_blank" rel="noopener noreferrer">${safe}</a>`
    : `<code>${safe}</code>`;
}

/** The row's static sibling in the same catalog, if it has one. */
function scheduleFor(row: SourceRow, byId: Map<string, SourceRow>): string | undefined {
  if (row.scheduledUrl) {
    return row.scheduledUrl;
  }
  return byId.get(row.rowId.replace(/:rt$/, ':static'))?.scheduledUrl;
}

function editorUrl(scheduled: string): string {
  return `${CONFIG.EDITOR_BASE}/#load=${encodeURIComponent(scheduled)}`;
}

/**
 * The visualizer needs a schedule to draw realtime against. Without a `cors`
 * key it proxies both halves, which is the right guess for a catalog URL.
 */
function viewerUrl(row: SourceRow, scheduled: string): string {
  const params = new URLSearchParams({ scheduled });
  if (row.vehiclesUrl) params.set('rt_vp', row.vehiclesUrl);
  if (row.tripUpdatesUrl) params.set('rt_tu', row.tripUpdatesUrl);
  if (row.alertsUrl) params.set('rt_al', row.alertsUrl);
  return `${CONFIG.VIEWER_BASE}/#${params.toString()}`;
}

function renderBody(row: SourceRow, entry: StatusEntry | undefined, byId: Map<string, SourceRow>): string {
  const state = entry?.state ?? row.state ?? 'unknown';
  const line = statusLine(row, state, entry);

  const urls = URL_FIELDS.map(([key, label]) => field(label, row[key] ? link(String(row[key])) : '')).join('');

  // geometry-car only sets final_url when it differs from the URL checked.
  const redirect =
    entry?.final_url
      ? field('Redirects to', `${link(entry.final_url)}<div class="text-xs opacity-60">the catalog entry points at a redirect</div>`)
      : '';

  const same = (row.same_endpoint_as ?? [])
    .map((id) => {
      const other = byId.get(id);
      const label = other ? `${other.name} (${CATALOG_LABELS[other.catalog] ?? other.catalog})` : id;
      return other
        ? `<button type="button" class="link" data-open-row="${escapeHtml(id)}">${escapeHtml(label)}</button>`
        : `<code>${escapeHtml(id)}</code>`;
    })
    .join('<br>');

  return `
    <div class="flex flex-wrap items-center gap-2 mb-4">
      <span class="badge ${STATE_BADGE[state]}">${STATE_LABELS[state]}</span>
      <span class="badge badge-outline">${KIND_LABELS[row.kind]}</span>
      <span class="badge badge-outline">${escapeHtml(CATALOG_LABELS[row.catalog] ?? row.catalog)}</span>
      ${line ? `<span class="text-sm ${state === 'down' ? 'text-error' : 'opacity-70'}">${escapeHtml(line)}</span>` : ''}
    </div>
    ${row.note ? `<div class="alert alert-info alert-soft text-sm mb-4 whitespace-pre-line">${escapeHtml(row.note)}</div>` : ''}
    <table class="table table-sm">
      <tbody>
        ${field('Operator', escapeHtml(row.operator_name))}
        ${field('Place', escapeHtml(placeLine(row)) || '<span class="opacity-60">no coordinates</span>')}
        ${field('Catalog id', `<code>${escapeHtml(row.feedId)}</code>`)}
        ${field('From', escapeHtml(row.source))}
        ${urls}
        ${redirect}
        ${field('Last status', entry?.code ? `HTTP ${entry.code}` : '')}
        ${field('Latency', entry?.latency_ms !== undefined ? `${entry.latency_ms} ms` : '')}
        ${field('Failed checks', entry?.failures ? String(entry.failures) : '')}
        ${field(state === 'down' ? 'Down since' : 'In this state since', formatDate(entry?.since))}
        ${field('Catalog status', escapeHtml(row.feed_status ?? ''))}
        ${field('Access', row.auth ? 'needs an API key; not checked' : '')}
        ${field('License', row.license_url ? link(row.license_url) : '')}
        ${field('Same endpoint as', same)}
      </tbody>
    </table>`;
}

/**
 * Open the modal for a row. Resolves when it closes. `onOpenRow` is how a
 * cross-link inside the modal hands off to another row.
 */
export function showSourceDetail(
  row: SourceRow,
  status: Record<string, StatusEntry>,
  byId: Map<string, SourceRow>,
  onOpenRow: (rowId: string) => void
): Promise<void> {
  const scheduled = scheduleFor(row, byId);
  const actions = [];
  if (row.kind === 'static' && row.scheduledUrl) {
    const url = editorUrl(row.scheduledUrl);
    actions.push({ label: 'Open in editor', className: 'btn-ghost', onClick: () => void window.open(url, '_blank', 'noopener') });
  }
  if (scheduled) {
    const url = viewerUrl(row, scheduled);
    actions.push({ label: 'Open in visualizer', className: 'btn-ghost', onClick: () => void window.open(url, '_blank', 'noopener') });
  }
  actions.push({ label: 'Close', className: 'btn-primary', onClick: () => {} });

  return showModal({
    title: escapeHtml(row.name || row.feedId),
    body: renderBody(row, status[row.rowId] ?? { state: stateOf(row, status) }, byId),
    actions,
    escapeAction: actions.length - 1,
    onMount: (close) => {
      document.querySelectorAll<HTMLElement>('[data-open-row]').forEach((button) => {
        button.addEventListener('click', () => {
          const id = button.dataset.openRow;
          close();
          if (id) {
            onOpenRow(id);
          }
        });
      });
    },
  });
}
