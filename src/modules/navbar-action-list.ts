import { renderMoonIcon, renderNavIcon, renderSunIcon, type NavIconName } from 'interlocking/ui/nav-icons';
import type { NavbarAction } from 'interlocking/ui/navbar-actions';

/**
 * This app's navbar action row and dock artwork. Element ids are the contract
 * with the click wiring in `src/index.ts`.
 */
export const NAVBAR_ACTIONS: NavbarAction[] = [
  {
    kind: 'toggle',
    id: 'theme-toggle',
    label: 'Toggle theme',
    iconOn: renderSunIcon('swap-on h-5 w-5'),
    iconOff: renderMoonIcon('swap-off h-5 w-5'),
    inputClass: 'theme-controller',
    value: 'light',
  },
  {
    kind: 'icon',
    id: 'help-btn',
    label: 'Guide',
    icon: renderNavIcon('guide'),
  },
];

/** Icons the mobile dock shares with the navbar, by element id. */
export const DOCK_ICONS: [string, NavIconName][] = [
  ['dock-browse', 'browse'],
  ['dock-guide', 'guide'],
];
