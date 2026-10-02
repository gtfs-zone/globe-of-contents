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
import { t } from '../i18n/messages';

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
  label: t('help.overview.label'),
  group: 'Getting Started',
  title: t('help.overview.title'),
  render: () =>
    [
      eyebrow('list.gtfs.zone'),
      lede(t('help.overview.lede')),
      glyphList([
        {
          icon: ICON_SEARCH,
          term: t('help.overview.search'),
          description: t('help.overview.searchText'),
        },
        {
          icon: ICON_MAP,
          term: t('help.overview.browse'),
          description: t('help.overview.browseText'),
        },
        {
          icon: ICON_OPEN,
          term: t('help.overview.open'),
          description: t('help.overview.openText'),
        },
      ]),
      appVersion
        ? footnote(t('help.overview.version', { version: appVersion }))
        : '',
    ].join(''),
};

const statesPage: HelpPage = {
  id: 'states',
  label: t('help.states.label'),
  group: 'Reference',
  title: t('help.states.title'),
  render: () =>
    [
      lede(t('help.states.check')),
      lede(t('help.states.url')),
      lede(t('help.states.roles')),
      glyphList([
        {
          icon: ICON_UP,
          term: t('help.states.up'),
          description: t('help.states.upText'),
        },
        {
          icon: ICON_PARTIAL,
          term: t('help.states.partial'),
          description: t('help.states.partialText'),
        },
        {
          icon: ICON_DOWN,
          term: t('help.states.down'),
          description: t('help.states.downText'),
        },
        {
          icon: ICON_UNKNOWN,
          term: t('help.states.unknown'),
          description: t('help.states.unknownText'),
        },
      ]),
      lede(t('help.states.chips')),
    ].join(''),
};

const mergingPage: HelpPage = {
  id: 'merging',
  label: t('help.merging.label'),
  group: 'Reference',
  title: t('help.merging.title'),
  render: () =>
    [
      lede(t('help.merging.lede')),
      `<ul class="list-disc list-inside space-y-1 text-sm">
        <li>${t('help.merging.sameUrl')}</li>
        <li>${t('help.merging.crossRef')}</li>
        <li>${t('help.merging.realtime')}</li>
      </ul>`,
      lede(t('help.merging.noFuzzy')),
      lede(t('help.merging.names')),
    ].join(''),
};

const unplacedPage: HelpPage = {
  id: 'unplaced',
  label: t('help.unplaced.label'),
  group: 'Reference',
  title: t('help.unplaced.title'),
  render: () =>
    [
      lede(t('help.unplaced.coordinates')),
      lede(t('help.unplaced.merged')),
    ].join(''),
};

const sourcesPage: HelpPage = {
  id: 'sources',
  label: t('help.sources.label'),
  group: 'Reference',
  title: t('help.sources.title'),
  render: () =>
    [
      lede(t('help.sources.lede')),
      `<ul class="list-disc list-inside space-y-1 text-sm">
        <li>${t('help.sources.transitland', {
          link: renderExternalLink(
            'https://github.com/transitland/transitland-atlas',
            'Transitland Atlas'
          ),
          license: renderExternalLink(
            'https://creativecommons.org/licenses/by/4.0/',
            'CC BY 4.0'
          ),
        })}</li>
        <li>${t('help.sources.mobilitydatabase', {
          link: renderExternalLink(
            'https://mobilitydatabase.org',
            'Mobility Database'
          ),
          license: renderExternalLink(
            'https://creativecommons.org/publicdomain/zero/1.0/',
            'CC0'
          ),
        })}</li>
        <li>${t('help.sources.gtfszone', {
          link: renderExternalLink(
            'https://rt.gtfs.zone/feeds',
            'rt.gtfs.zone'
          ),
        })}</li>
        <li>${t('help.sources.ntd', {
          link: renderExternalLink(
            'https://data.transportation.gov/d/2u7n-ub22',
            'National Transit Database'
          ),
        })}</li>
      </ul>`,
      lede(
        t('help.sources.json', {
          link: renderExternalLink(
            'https://data.gtfs.zone/manifest.json',
            'data.gtfs.zone'
          ),
          search: '<code>search.json</code>',
          feeds: '<code>feeds.json</code>',
          sources: '<code>sources.json</code>',
          status: '<code>status.json</code>',
        })
      ),
      lede(t('help.sources.licenses')),
    ].join(''),
};

export const HELP_PAGES: HelpPage[] = [
  overviewPage,
  statesPage,
  mergingPage,
  unplacedPage,
  sourcesPage,
];
