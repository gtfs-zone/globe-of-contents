import { renderMoonIcon, renderNavIcon, renderSunIcon } from 'interlocking/ui/nav-icons';
import type { NavbarAction } from 'interlocking/ui/navbar-actions';
import { CONFIG } from '../config';

/**
 * This app's navbar action row. Element ids are the contract with the click
 * wiring in `src/index.ts`.
 */
export const NAVBAR_ACTIONS: NavbarAction[] = [
  {
    // The raw artifacts, for anyone who would rather have the JSON.
    kind: 'link',
    id: 'data-link',
    label: 'Raw data (sources.json)',
    icon: renderNavIcon('feedData'),
    href: `${CONFIG.DATA_BASE}/sources.json`,
    external: true,
  },
  {
    kind: 'toggle',
    id: 'theme-toggle',
    label: 'Toggle theme',
    iconOn: renderSunIcon('swap-on h-5 w-5'),
    iconOff: renderMoonIcon('swap-off h-5 w-5'),
    inputClass: 'theme-controller',
    value: 'light',
  },
];
