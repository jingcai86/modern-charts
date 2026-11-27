import {
  VERSION,
  type ThemeModePreference
} from '../../src/core/types';
import type { MCBaseChart } from '../../src/core/base-chart';
import { configureChartFeatures } from '../../src/core/features';
import { CHART_CATALOG, type ChartCatalogEntry } from './catalog';
import { loadChart, STUDIO_BOOTSTRAP_OPTIONS } from './chart-loader';
import { createGuideNavigationGroups } from './guides/navigation';
import { GUIDES_CATALOG, type GuideId } from './guides/types';
import { disposeOverviewPage, renderOverviewPage, writeStoredHomeTab } from './pages/overview';
import { renderChartDetailPage } from './pages/chart-detail';
import { syncAllStoredConfigsPalette, syncAllStoredConfigsTheme } from './state/config-store';
import {
  getGlobalPalette,
  getGlobalThemeMode,
  setGlobalPalette,
  setGlobalThemeMode,
  subscribePaletteChanges,
  subscribeThemeChanges,
  type StudioPaletteName
} from './state/theme';

// Keep Studio header pill and page title synchronized with the active package VERSION
const versionPill = document.querySelector('.version-pill');
if (versionPill) {
  versionPill.textContent = `v${VERSION}`;
}
document.title = `modern-charts v${VERSION} — Composable Web Component Charts`;

let activeOverviewCharts: MCBaseChart<any>[] = [];
let activeDetailEntry: ChartCatalogEntry | null = null;
let activeGuide: { id: GuideId } | null = null;
let renderGuidePage: typeof import('./guides/index').renderGuidePage | undefined;
let chartD3Ready = false;

// Primary Navigation Popover Dropdown
const siteNav = document.querySelector('.site-nav') as HTMLElement | null;
const navTrigger = document.getElementById(
  'nav-pages-trigger'
) as HTMLButtonElement | null;
const navCurrentLabel = document.getElementById(
  'nav-pages-current-label'
) as HTMLSpanElement | null;
const navMenu = document.getElementById('studio-pages-menu') as HTMLElement | null;

function openGuideMenuGroup(link: Element | null): void {
  const group = link?.closest<HTMLDetailsElement>('details.nav-dropdown-group');
  if (group) group.open = true;
}

if (navTrigger && navMenu) {
  navMenu.insertBefore(createGuideNavigationGroups(), navMenu.querySelector('#studio-pages-resources'));
  navMenu.addEventListener('toggle', (event) => {
    const isOpen = (event as ToggleEvent).newState === 'open';
    navTrigger.setAttribute('aria-expanded', String(isOpen));
    if (isOpen) openGuideMenuGroup(navMenu.querySelector('[aria-current="page"]'));

    // Anchor positioning fallback for browsers without CSS `position-area`
    if (
      isOpen &&
      (typeof CSS === 'undefined' || !CSS.supports('position-area', 'block-end'))
    ) {
      const triggerRect = navTrigger.getBoundingClientRect();
      const gap = 8;
      const availableSpace = Math.max(triggerRect.top, window.innerHeight - triggerRect.bottom);
      navMenu.style.maxBlockSize = `${Math.max(0, availableSpace - gap * 2)}px`;
      const menuRect = navMenu.getBoundingClientRect();
      let top = triggerRect.bottom + gap;
      if (top + menuRect.height > window.innerHeight - gap) {
        top = Math.max(gap, triggerRect.top - menuRect.height - gap);
      }
      const maxLeft = Math.max(gap, window.innerWidth - menuRect.width - gap);
      const left = Math.max(
        gap,
        Math.min(triggerRect.right - menuRect.width, maxLeft)
      );
      navMenu.style.top = `${Math.round(top)}px`;
      navMenu.style.left = `${Math.round(left)}px`;
    }
  });

  navMenu.addEventListener('click', (event) => {
    const link = (event.target as HTMLElement | null)?.closest('a');
    if (link) {
      if (link.dataset.navRoute === 'overview') {
        writeStoredHomeTab('examples');
        if (window.location.hash === '#/' || window.location.hash === '') {
          handleRoute();
        }
      }
      if (typeof navMenu.hidePopover === 'function') {
        navMenu.hidePopover();
      }
    }
  });
}

const brandHomeLink = document.getElementById('brand-home-link');
brandHomeLink?.addEventListener('click', () => {
  writeStoredHomeTab('examples');
  if (window.location.hash === '#/' || window.location.hash === '') {
    handleRoute();
  }
});

function syncTopNavActiveState(activeKey: string, showDropdown: boolean): void {
  if (siteNav) {
    siteNav.hidden = !showDropdown;
  }
  if (!showDropdown && navMenu && typeof navMenu.hidePopover === 'function') {
    try {
      navMenu.hidePopover();
    } catch {
      // ignore if already closed
    }
  }

  let activeLabel = '⊞ All Charts';
  document
    .querySelectorAll<HTMLAnchorElement>('#studio-pages-menu [data-nav-route]')
    .forEach((link) => {
      const isCurrent = link.dataset.navRoute === activeKey;
      if (isCurrent) {
        link.setAttribute('aria-current', 'page');
        openGuideMenuGroup(link);
        activeLabel = link.dataset.navLabel || link.textContent?.trim() || activeLabel;
      } else {
        link.removeAttribute('aria-current');
      }
    });
  if (navCurrentLabel) {
    navCurrentLabel.textContent = activeLabel;
  }
}

async function loadGuidePage(root: HTMLElement, id: GuideId, hash: string): Promise<void> {
  const guide = { id };
  activeGuide = guide;
  if (renderGuidePage) {
    renderGuidePage(root, id, getGlobalThemeMode());
    return;
  }

  const status = document.createElement('p');
  status.setAttribute('role', 'status');
  status.textContent = 'Loading guide…';
  root.replaceChildren(status);

  const isCurrentGuide = () => activeGuide === guide && window.location.hash === hash;
  try {
    ({ renderGuidePage } = await import('./guides/index'));
  } catch {
    if (isCurrentGuide()) {
      status.textContent = 'Could not load this guide. Reload the page to try again.';
    }
    return;
  }
  if (isCurrentGuide()) renderGuidePage(root, id, getGlobalThemeMode());
}

function showChartDetailPage(root: HTMLElement, entry: ChartCatalogEntry, hash: string): void {
  const showDetail = () => {
    renderChartDetailPage(root, entry);
    activeDetailEntry = entry;
  };
  if (chartD3Ready && customElements.get(entry.tagName)) {
    showDetail();
    return;
  }

  activeDetailEntry = null;
  const status = document.createElement('p');
  status.setAttribute('role', 'status');
  status.textContent = 'Loading chart…';
  root.replaceChildren(status);

  // The same chart may be opened again before an earlier request finishes.
  const isCurrent = () => status.parentElement === root && window.location.hash === hash;
  const loadD3 = chartD3Ready
    ? undefined
    : import('../../src/core/d3-curated').then(({ registerCuratedChartD3 }) => {
        if (chartD3Ready) return;
        registerCuratedChartD3();
        chartD3Ready = true;
      });
  void Promise.all([loadChart(entry), loadD3]).then(
    () => {
      if (isCurrent()) showDetail();
    },
    () => {
      if (isCurrent()) status.textContent = 'Could not load this chart. Reload the page to try again.';
    }
  );
}

function handleRoute(): void {
  const root = document.getElementById('app-root');
  if (!root) return;

  const hash = window.location.hash || '#/';

  const guideMatch = hash.match(/^#\/guides?(?:\/([a-z0-9-]+))?$/i);
  if (guideMatch) {
    disposeOverviewPage(root);
    const requested = (guideMatch[1] ?? 'custom-layers').toLowerCase() as GuideId;
    const found = GUIDES_CATALOG.find((g) => g.id === requested);
    const resolvedId: GuideId = found ? found.id : 'custom-layers';
    activeDetailEntry = null;
    activeOverviewCharts = [];
    void loadGuidePage(root, resolvedId, hash);
    syncTopNavActiveState(`guide:${resolvedId}`, true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  const chartMatch = hash.match(/^#\/chart\/([a-z0-9-]+)$/i);
  if (chartMatch) {
    const chartId = chartMatch[1].toLowerCase();
    const entry = CHART_CATALOG.find((c) => c.id === chartId);
    if (entry) {
      disposeOverviewPage(root);
      activeGuide = null;
      activeOverviewCharts = [];
      showChartDetailPage(root, entry, hash);
      syncTopNavActiveState('overview', true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
  }

  if (activeGuide) {
    root.replaceChildren();
    void configureChartFeatures(STUDIO_BOOTSTRAP_OPTIONS);
  }
  activeDetailEntry = null;
  activeGuide = null;
  activeOverviewCharts = renderOverviewPage(root);
  syncTopNavActiveState('overview', false);
}

window.addEventListener('hashchange', handleRoute);

// Appearance controls the light/dark surfaces independently of the design-system palette.
const globalAppearanceSelect = document.getElementById(
  'global-appearance-select'
) as HTMLSelectElement | null;

if (globalAppearanceSelect) {
  globalAppearanceSelect.value = getGlobalThemeMode();
}

function syncActiveViewTheme(pref: ThemeModePreference): void {
  if (globalAppearanceSelect && globalAppearanceSelect.value !== pref) {
    globalAppearanceSelect.value = pref;
  }

  syncAllStoredConfigsTheme(pref);

  const root = document.getElementById('app-root')!;
  if (activeGuide) {
    renderGuidePage?.(root, activeGuide.id, pref);
  } else if (activeDetailEntry) {
    renderChartDetailPage(root, activeDetailEntry);
  } else {
    activeOverviewCharts.forEach((chart) => {
      chart.setConfig({
        ...chart.config,
        themeMode: pref,
        isInteractive: false,
        animate: false,
        labelMode: 'svg',
        xTitle: undefined,
        yTitle: undefined,
        view: chart.config.view
          ? { ...chart.config.view, showControls: false }
          : undefined
      });
    });
  }
}

globalAppearanceSelect?.addEventListener('change', (e) => {
  const target = (e.target as HTMLSelectElement).value as ThemeModePreference;
  const nextPref = setGlobalThemeMode(target);
  syncActiveViewTheme(nextPref);
});

subscribeThemeChanges((nextPref) => {
  syncActiveViewTheme(nextPref);
});

const globalPaletteSelect = document.getElementById('global-palette-select') as HTMLSelectElement | null;
if (globalPaletteSelect) globalPaletteSelect.value = getGlobalPalette();

function syncActiveViewPalette(palette: StudioPaletteName): void {
  if (globalPaletteSelect) globalPaletteSelect.value = palette;
  syncAllStoredConfigsPalette(palette);
  const root = document.getElementById('app-root');
  if (!root) return;
  if (activeGuide) {
    renderGuidePage?.(root, activeGuide.id, getGlobalThemeMode());
  } else if (activeDetailEntry) {
    renderChartDetailPage(root, activeDetailEntry);
  } else {
    activeOverviewCharts.forEach((chart) => chart.setConfig({ ...chart.config, palette }));
  }
}

globalPaletteSelect?.addEventListener('change', () => {
  syncActiveViewPalette(setGlobalPalette(globalPaletteSelect.value));
});
subscribePaletteChanges(syncActiveViewPalette);

handleRoute();
