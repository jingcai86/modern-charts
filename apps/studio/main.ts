import {
  registerModernCharts,
  type MCBaseChart
} from '../../src/index';
import { CHART_CATALOG, type ChartCatalogEntry } from './catalog';
import { GUIDES_CATALOG, renderGuidePage, type GuideId } from './guides';
import { renderOverviewPage } from './pages/overview';
import { renderChartDetailPage } from './pages/chart-detail';
import { syncAllStoredConfigsTheme } from './state/config-store';
import {
  getGlobalThemeMode,
  setGlobalThemeMode,
  subscribeThemeChanges
} from './state/theme';

registerModernCharts();

let activeOverviewCharts: MCBaseChart<any>[] = [];
let activeDetailChart: MCBaseChart<any> | null = null;
let activeDetailEntry: ChartCatalogEntry | null = null;
let activeGuideId: GuideId | null = null;

// Primary Navigation Popover Dropdown
const siteNav = document.querySelector('.site-nav') as HTMLElement | null;
const navTrigger = document.getElementById(
  'nav-pages-trigger'
) as HTMLButtonElement | null;
const navCurrentLabel = document.getElementById(
  'nav-pages-current-label'
) as HTMLSpanElement | null;
const navMenu = document.getElementById('studio-pages-menu') as HTMLElement | null;

if (navTrigger && navMenu) {
  navMenu.addEventListener('toggle', (event) => {
    const isOpen = (event as ToggleEvent).newState === 'open';
    navTrigger.setAttribute('aria-expanded', String(isOpen));

    // Anchor positioning fallback for browsers without CSS `position-area`
    if (
      isOpen &&
      (typeof CSS === 'undefined' || !CSS.supports('position-area', 'block-end'))
    ) {
      const triggerRect = navTrigger.getBoundingClientRect();
      const menuRect = navMenu.getBoundingClientRect();
      const gap = 8;
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
    if (link && typeof navMenu.hidePopover === 'function') {
      navMenu.hidePopover();
    }
  });
}

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
        activeLabel = link.dataset.navLabel || link.textContent?.trim() || activeLabel;
      } else {
        link.removeAttribute('aria-current');
      }
    });
  if (navCurrentLabel) {
    navCurrentLabel.textContent = activeLabel;
  }
}

function handleRoute(): void {
  const root = document.getElementById('app-root');
  if (!root) return;

  const hash = window.location.hash || '#/';

  const guideMatch = hash.match(/^#\/guides?(?:\/([a-z0-9-]+))?$/i);
  if (guideMatch) {
    const requested = (guideMatch[1] ?? 'custom-layers').toLowerCase() as GuideId;
    const found = GUIDES_CATALOG.find((g) => g.id === requested);
    const resolvedId: GuideId = found ? found.id : 'custom-layers';
    activeDetailChart = null;
    activeDetailEntry = null;
    activeOverviewCharts = [];
    activeGuideId = resolvedId;
    renderGuidePage(root, resolvedId, getGlobalThemeMode());
    syncTopNavActiveState(`guide:${resolvedId}`, true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  const chartMatch = hash.match(/^#\/chart\/([a-z0-9-]+)$/i);
  if (chartMatch) {
    const chartId = chartMatch[1].toLowerCase();
    const entry = CHART_CATALOG.find((c) => c.id === chartId);
    if (entry) {
      activeGuideId = null;
      activeOverviewCharts = [];
      activeDetailEntry = entry;
      activeDetailChart = renderChartDetailPage(root, entry);
      syncTopNavActiveState('overview', true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
  }

  activeDetailChart = null;
  activeDetailEntry = null;
  activeGuideId = null;
  activeOverviewCharts = renderOverviewPage(root);
  syncTopNavActiveState('overview', false);
}

window.addEventListener('hashchange', handleRoute);

// Two-state Light / Dark Theme Selector (follows system by default, stores literal override only on divergence)
const globalThemeSelect = document.getElementById(
  'global-theme-select'
) as HTMLSelectElement | null;

if (globalThemeSelect) {
  globalThemeSelect.value = getGlobalThemeMode();
}

function syncActiveViewTheme(mode: 'light' | 'dark'): void {
  if (globalThemeSelect && globalThemeSelect.value !== mode) {
    globalThemeSelect.value = mode;
  }

  syncAllStoredConfigsTheme(mode);

  const root = document.getElementById('app-root')!;
  if (activeGuideId) {
    renderGuidePage(root, activeGuideId, mode);
  } else if (activeDetailChart && activeDetailEntry) {
    activeDetailChart = renderChartDetailPage(root, activeDetailEntry);
  } else {
    activeOverviewCharts.forEach((chart) => {
      chart.setConfig({
        ...chart.config,
        themeMode: mode,
        xTitle: undefined,
        yTitle: undefined,
        view: chart.config.view
          ? { ...chart.config.view, showControls: false }
          : undefined
      });
    });
  }
}

globalThemeSelect?.addEventListener('change', (e) => {
  const target = (e.target as HTMLSelectElement).value as 'light' | 'dark';
  const effective = setGlobalThemeMode(target);
  syncActiveViewTheme(effective);
});

subscribeThemeChanges((nextMode) => {
  syncActiveViewTheme(nextMode);
});

handleRoute();
