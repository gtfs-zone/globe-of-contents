/**
 * Focus changes and the hash.
 *
 * The focus half is interlocking's `FocusController`: map click, list link,
 * search pick, hash change and boot restore all converge on it. The hash's
 * other half is the filters, set with `setFilterParams`, which replaces the
 * hash in place so typing in the search box leaves no history entry per
 * keystroke. Only Home's hash carries the filters; a Feed or Source hash names
 * just the page.
 */

import type { BreadcrumbItem } from 'interlocking/ui/breadcrumb-trail';
import type { FocusHooks } from 'interlocking/ui/focus-controller';
import { FocusController } from 'interlocking/ui/focus-controller';
import type { PageStateCodec } from 'interlocking/ui/page-state-manager';
import { PageStateManager } from 'interlocking/ui/page-state-manager';
import type { CatalogueIndex } from '../data/artifacts';
import type { PageState } from '../types/page-state';
import { isPageState, pageFromParams, pageToParams } from '../types/page-state';
import { buildBreadcrumbs, validateState } from './pages';

const CODEC: PageStateCodec<PageState> = {
  toParams: pageToParams,
  fromParams: pageFromParams,
  isPageState,
};

/** A page state manager whose Feed and Source hashes leave the filters out. */
class AppPages extends PageStateManager<PageState, BreadcrumbItem<PageState>> {
  override buildHash(state: PageState): string {
    return state.type === 'home' ? super.buildHash(state) : pageToParams(state).toString();
  }
}

export class AppState extends FocusController<PageState, BreadcrumbItem<PageState>> {
  constructor(hooks: FocusHooks<PageState>) {
    super(new AppPages({ codec: CODEC, enableUrlSync: true }), hooks);
  }

  /** Point the breadcrumbs and the hash validator at the loaded catalogue. */
  setIndex(index: CatalogueIndex): void {
    this.pages.setBreadcrumbBuilder((state) => buildBreadcrumbs(index, state));
    this.pages.setStateValidator((state) => validateState(index, state));
  }

  /** Replace the filter half of the hash, without a history entry. */
  setFilterParams(params: Record<string, string>): void {
    this.pages.setFeedParams(params, false);
    this.replaceHash();
  }

  /** Rewrite the hash to the current state in place. */
  replaceHash(): void {
    const hash = this.pages.buildHash(this.focus);
    if (hash !== window.location.hash.slice(1)) {
      // replaceState fires no hashchange, so the manager's suppress flag stays clear.
      window.history.replaceState(
        null,
        '',
        hash ? `#${hash}` : `${window.location.pathname}${window.location.search}`
      );
    }
  }
}
