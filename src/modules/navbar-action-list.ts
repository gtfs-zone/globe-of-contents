import {
  renderMoonIcon,
  renderNavIcon,
  renderSunIcon,
  type NavIconName,
} from 'gtfs-zone-web-common/ui/nav-icons';
import type { NavbarAction } from 'gtfs-zone-web-common/ui/navbar-actions';
import { t } from '../i18n/messages';

/**
 * This app's navbar action row and dock artwork. Element ids are the contract
 * with the click wiring in `src/index.ts`.
 */
export const NAVBAR_ACTIONS: NavbarAction[] = [
  {
    kind: 'toggle',
    id: 'theme-toggle',
    label: t('nav.theme'),
    iconOn: renderSunIcon('swap-on h-5 w-5'),
    iconOff: renderMoonIcon('swap-off h-5 w-5'),
    inputClass: 'theme-controller',
    value: 'light',
  },
  {
    kind: 'icon',
    id: 'help-btn',
    label: t('shell.guide'),
    icon: renderNavIcon('guide'),
  },
  { kind: 'locale', id: 'locale-toggle' },
];

/** Icons the mobile dock shares with the navbar, by element id. */
export const DOCK_ICONS: [string, NavIconName][] = [
  ['dock-browse', 'browse'],
  ['dock-guide', 'guide'],
];
