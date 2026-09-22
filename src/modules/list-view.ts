/**
 * The source list. Paints at most DISPLAY_CAP rows of the filtered set and says
 * how many it is not showing, because painting tens of thousands of rows would
 * freeze the page for a list nobody scrolls to the end of.
 */

import { CONFIG } from '../config';
import type { SourceRow, StatusEntry } from '../data/artifacts';
import { stateOf } from '../data/artifacts';
import { escapeHtml } from 'interlocking/util/escape-html';
import {
  CATALOG_SHORT,
  KIND_LABELS,
  STATE_BADGE,
  STATE_LABELS,
  formatCount,
  placeLine,
  statusLine,
} from './labels';

export class ListView {
  private list: HTMLElement;
  private count: HTMLElement;
  private status: Record<string, StatusEntry> = {};

  constructor(list: HTMLElement, count: HTMLElement, onSelect: (rowId: string) => void) {
    this.list = list;
    this.count = count;
    this.list.addEventListener('click', (event) => {
      const row = (event.target as Element | null)?.closest<HTMLElement>('[data-row-id]');
      if (row?.dataset.rowId) {
        onSelect(row.dataset.rowId);
      }
    });
  }

  setStatus(status: Record<string, StatusEntry>): void {
    this.status = status;
  }

  render(rows: SourceRow[], selected: string | null): void {
    const shown = rows.slice(0, CONFIG.DISPLAY_CAP);
    const unplaced = rows.reduce((n, row) => (row.lat === undefined ? n + 1 : n), 0);

    const hidden = rows.length - shown.length;
    this.count.innerHTML =
      `<span class="font-semibold">${formatCount(rows.length)}</span> matching` +
      (hidden > 0 ? `, first ${formatCount(shown.length)} shown` : '') +
      (unplaced > 0
        ? ` <span class="opacity-60">(${formatCount(unplaced)} have no coordinates and are not on the map)</span>`
        : '');

    if (rows.length === 0) {
      this.list.innerHTML =
        '<p class="text-base-content/50 text-sm text-center py-8">No sources match these filters</p>';
      return;
    }

    this.list.innerHTML =
      shown.map((row) => this.renderRow(row, row.rowId === selected)).join('') +
      (hidden > 0
        ? `<p class="text-xs text-center opacity-60 py-4">${formatCount(hidden)} more; narrow the filters to see them</p>`
        : '');
  }

  private renderRow(row: SourceRow, selected: boolean): string {
    const state = stateOf(row, this.status);
    const line = statusLine(row, state, this.status[row.rowId]);
    const place = placeLine(row);
    const secondary = [row.operator_name !== row.name ? row.operator_name : '', place]
      .filter(Boolean)
      .join(' - ');

    return `
      <button type="button" data-row-id="${escapeHtml(row.rowId)}"
        class="w-full text-left px-3 py-2 border-b border-base-200 hover:bg-base-200 flex items-start gap-3 ${selected ? 'bg-base-200' : ''}">
        <span class="badge badge-xs ${STATE_BADGE[state]} mt-1.5 shrink-0" title="${STATE_LABELS[state]}"></span>
        <span class="min-w-0 flex-1">
          <span class="flex items-center gap-2">
            <span class="truncate font-medium text-sm">${escapeHtml(row.name || row.feedId)}</span>
            ${row.lat === undefined ? '<span class="badge badge-outline badge-xs shrink-0" title="No coordinates">unplaced</span>' : ''}
          </span>
          ${secondary ? `<span class="block truncate text-xs opacity-70">${escapeHtml(secondary)}</span>` : ''}
          ${state !== 'up' && line ? `<span class="block truncate text-xs ${state === 'down' ? 'text-error' : 'opacity-60'}">${escapeHtml(line)}</span>` : ''}
        </span>
        <span class="flex flex-col items-end gap-1 shrink-0">
          <span class="badge badge-sm ${row.kind === 'rt' ? 'badge-secondary' : 'badge-primary'} badge-soft">${KIND_LABELS[row.kind]}</span>
          <span class="text-[10px] uppercase opacity-60">${escapeHtml(CATALOG_SHORT[row.catalog] ?? row.catalog)}${row.country_code ? ` ${escapeHtml(row.country_code)}` : ''}</span>
        </span>
      </button>`;
  }
}
