/**
 * The Guide's pages: what exist, their grouping, and their copy. Rendering
 * lives in gtfs-zone-web-common's `ui/help-modal`.
 */

import {
  eyebrow,
  footnote,
  glyphList,
  lede,
  type HelpPageEntry,
} from 'gtfs-zone-web-common/ui/help-modal';
import { renderExternalLink } from 'gtfs-zone-web-common/ui/about-links';

export type HelpGroup = 'Getting Started' | 'Reference';

export interface HelpPage extends HelpPageEntry {
  group: HelpGroup;
}

export const HELP_GROUP_ORDER: HelpGroup[] = ['Getting Started', 'Reference'];

function icon(paths: string): string {
  return `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}

const ICON_SEARCH = icon(
  '<circle cx="14" cy="14" r="8"/><path d="M20 20l7 7"/>'
);
const ICON_MAP = icon(
  '<path d="M16 5c-4.4 0-8 3.4-8 7.6C8 18.4 16 27 16 27s8-8.6 8-14.4C24 8.4 20.4 5 16 5z"/><circle cx="16" cy="12.5" r="2.5"/>'
);
const ICON_OPEN = icon(
  '<path d="M18 5h9v9"/><path d="M27 5L15 17"/><path d="M24 19v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V11a2 2 0 0 1 2-2h7"/>'
);
const ICON_UP = icon(
  '<circle cx="16" cy="16" r="10"/><path d="M11 16l4 4 7-8"/>'
);
const ICON_DOWN = icon(
  '<circle cx="16" cy="16" r="10"/><path d="M12 12l8 8M20 12l-8 8"/>'
);
const ICON_PARTIAL = icon(
  '<circle cx="16" cy="16" r="10"/><path d="M16 6a10 10 0 0 1 0 20z" fill="currentColor"/>'
);
const ICON_UNKNOWN = icon(
  '<circle cx="16" cy="16" r="10"/><path d="M11 16h10"/>'
);

let appVersion = '';

/** The version is only known once `__APP_VERSION__` is read at boot. */
export function setHelpVersion(version: string): void {
  appVersion = version;
}

const overviewPage: HelpPage = {
  id: 'overview',
  label: 'Overview',
  group: 'Getting Started',
  title: 'Every public GTFS feed, and whether it answers',
  render: () =>
    [
      eyebrow('list.gtfs.zone'),
      lede(
        'Every public GTFS schedule and GTFS Realtime feed in the Transitland Atlas, the Mobility Database and rt.gtfs.zone, merged into one entry per transit system and checked every day.'
      ),
      glyphList([
        {
          icon: ICON_SEARCH,
          term: 'Search',
          description:
            'Typing in the search box narrows the list and the map as you type, and offers the best matches in a dropdown: by name, place, or the host a feed is served from. Places and points of interest are offered under the matches; picking one moves the map there and lists the nearest feeds first. The counts at the top of the list filter it by state, and the switch under them to feeds with realtime.',
        },
        {
          icon: ICON_MAP,
          term: 'Browse',
          description:
            'The list puts the most recently modified schedules first, or the best matches first while searching. Pick a feed from the list, the map or the dropdown to see its schedule and realtime URLs, and every catalog entry it was built from.',
        },
        {
          icon: ICON_OPEN,
          term: 'Open it',
          description:
            'A feed with a schedule opens in the editor; one with a schedule and realtime also opens in the visualizer.',
        },
      ]),
      appVersion ? footnote(`Version ${appVersion}`) : '',
    ].join(''),
};

const statesPage: HelpPage = {
  id: 'states',
  label: 'Up, partial, down, inaccessible',
  group: 'Reference',
  title: 'What up, partial, down and inaccessible mean',
  render: () =>
    [
      lede(
        'Once a day every URL is asked for its headers only: a HEAD request, or a one-byte ranged GET when the server refuses HEAD. No feed is downloaded.'
      ),
      lede(
        'A URL is up when it answered with a success, possibly after redirects, and down when the check failed: DNS, TLS, a timeout, a refused connection or an HTTP error. A URL that needs an API key is never checked.'
      ),
      lede(
        'A feed has roles: its schedule, and its realtime trip updates, vehicle positions and service alerts. A role is up when any of its URLs answered, so one catalog listing a mistyped URL does not take down a feed whose other URL works. The feed itself is:'
      ),
      glyphList([
        {
          icon: ICON_UP,
          term: 'Up',
          description: 'Its schedule and every realtime role answered.',
        },
        {
          icon: ICON_PARTIAL,
          term: 'Partial',
          description:
            'Its schedule answered, but at least one realtime role did not. Without a checked schedule, some realtime roles answered and some did not.',
        },
        {
          icon: ICON_DOWN,
          term: 'Down',
          description:
            'Its schedule did not answer. "Down since" is when it stopped answering. Without a checked schedule, none of its realtime roles answered.',
        },
        {
          icon: ICON_UNKNOWN,
          term: 'Inaccessible',
          description:
            'Nothing it lists could be checked: every URL needs an API key, or none has been checked yet.',
        },
      ]),
      lede(
        'The chips on each feed are its realtime roles: TU for trip updates, VP for vehicle positions, SA for service alerts, and RT for a realtime URL whose catalog does not say which of the three it serves. Each is green when it answered the last check, red when it did not, and grey when it was not checked.'
      ),
    ].join(''),
};

const mergingPage: HelpPage = {
  id: 'merging',
  label: 'How feeds are merged',
  group: 'Reference',
  title: 'How catalog entries become one feed',
  render: () =>
    [
      lede(
        'The catalogs list the same transit system separately, and often split its schedule and realtime into separate entries. Here they are merged into one feed per system, and nothing is dropped: each feed links to every catalog entry it came from.'
      ),
      `<ul class="list-disc list-inside space-y-1 text-sm">
        <li>Entries naming the same URL, once normalized, are the same feed.</li>
        <li>Mobility Database cross-references between a schedule and its realtime join them.</li>
        <li>Realtime URLs on the same host and path that differ only in a last vehicles, trips or alerts segment are one feed.</li>
      </ul>`,
      lede(
        'There is no fuzzy matching on names, so two entries for the same system with different URLs and no cross-reference stay separate. A feed keeps its id across days as long as most of its entries stay together.'
      ),
      lede(
        "The name is the Transitland operator's, else the Mobility Database provider's (its feed name becomes the subtitle), else the single agency the schedule names, else any catalog entry's. Every other name is kept, and search finds the feed by any of them."
      ),
    ].join(''),
};

const unplacedPage: HelpPage = {
  id: 'unplaced',
  label: 'Unplaced feeds',
  group: 'Reference',
  title: 'Why some feeds are not on the map',
  render: () =>
    [
      lede(
        'Coordinates come from the Mobility Database, which records a location and a bounding box for most of its feeds. Transitland Atlas entries carry no place at all, so a Transitland-only feed has nowhere to be drawn.'
      ),
      lede(
        'A feed that merges a Transitland entry with a Mobility Database one takes the Mobility Database place. The rest are listed but not mapped, and the count of them is always shown next to the map rather than quietly left out.'
      ),
    ].join(''),
};

const sourcesPage: HelpPage = {
  id: 'sources',
  label: 'Where the data comes from',
  group: 'Reference',
  title: 'Where the data comes from',
  render: () =>
    [
      lede('Three catalogs, refreshed daily by gtfs-zone-feed-catalog:'),
      `<ul class="list-disc list-inside space-y-1 text-sm">
        <li>${renderExternalLink('https://github.com/transitland/transitland-atlas', 'Transitland Atlas')}: the open DMFR corpus, ${renderExternalLink('https://creativecommons.org/licenses/by/4.0/', 'CC BY 4.0')}</li>
        <li>${renderExternalLink('https://mobilitydatabase.org', 'Mobility Database')}: MobilityData's catalog, with places, ${renderExternalLink('https://creativecommons.org/publicdomain/zero/1.0/', 'CC0')}</li>
        <li>${renderExternalLink('https://rt.gtfs.zone/feeds', 'rt.gtfs.zone')}: the realtime feeds gtfs.zone serves itself, such as Amtrak</li>
      </ul>`,
      lede(
        `Everything this page shows is published as JSON at ${renderExternalLink('https://data.gtfs.zone/manifest.json', 'data.gtfs.zone')}: <code>search.json</code> for the merged feeds in brief, <code>feeds.json</code> for them in full, <code>sources.json</code> for the catalog entries and <code>status.json</code> for each check.`
      ),
      lede(
        "The catalogs list where feeds are; the feeds themselves belong to their publishers. Each feed's page links the license its catalog records, and that license, not this site's, is what covers the data."
      ),
    ].join(''),
};

export const HELP_PAGES: HelpPage[] = [
  overviewPage,
  statesPage,
  mergingPage,
  unplacedPage,
  sourcesPage,
];
