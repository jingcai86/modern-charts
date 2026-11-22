import {
  registerModernCharts,
  type MCBaseChart,
  type ThemeModePreference
} from '../../src/index';
import { CHART_CATALOG, type ChartCatalogEntry } from './catalog';
import { GUIDES_CATALOG, renderGuidePage, type GuideId } from './guides';
import { renderOverviewPage } from './pages/overview';
import { renderChartDetailPage } from './pages/chart-detail';
import { syncAllStoredConfigsTheme } from './state/config-store';
import {
  getGlobalThemeMode,
  setGlobalThemeMode,
  subscribeSystemThemeChange
} from './state/theme';

registerModernCharts();

let activeOverviewCharts: MCBaseChart<any>[] = [];
let activeDetailChart: MCBaseChart<any> | null = null;
let activeDetailEntry: ChartCatalogEntry | null = null;
let activeGuideId: GuideId | null = null;

function syncTopNavActiveState(activeKey: string): void {
  document
    .querySelectorAll<HTMLAnchorElement>('[data-nav-route]')
    .forEach((link) => {
      link.classList.toggle('active', link.dataset.navRoute === activeKey);
    });
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
    syncTopNavActiveState(`guide:${resolvedId}`);
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
      syncTopNavActiveState('overview');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
  }

  activeDetailChart = null;
  activeDetailEntry = null;
  activeGuideId = null;
  activeOverviewCharts = renderOverviewPage(root);
  syncTopNavActiveState('overview');
}

window.addEventListener('hashchange', handleRoute);

// Global Theme Switcher (System / Dark / Light + localStorage + OS listener)
const globalThemeSelect = document.getElementById(
  'global-theme-select'
) as HTMLSelectElement | null;

if (globalThemeSelect) {
  globalThemeSelect.value = getGlobalThemeMode();
}

function applyGlobalThemePreference(pref: ThemeModePreference): void {
  setGlobalThemeMode(pref);
  if (globalThemeSelect && globalThemeSelect.value !== pref) {
    globalThemeSelect.value = pref;
  }

  syncAllStoredConfigsTheme(pref);

  const root = document.getElementById('app-root')!;
  if (activeGuideId) {
    renderGuidePage(root, activeGuideId, pref);
  } else if (activeDetailChart && activeDetailEntry) {
    activeDetailChart = renderChartDetailPage(root, activeDetailEntry);
  } else {
    activeOverviewCharts.forEach((chart) => {
      chart.setConfig({
        ...chart.config,
        themeMode: pref,
        view: chart.config.view
          ? { ...chart.config.view, showControls: false }
          : undefined
      });
    });
  }
}

globalThemeSelect?.addEventListener('change', (e) => {
  const pref = (e.target as HTMLSelectElement).value as ThemeModePreference;
  applyGlobalThemePreference(pref);
});

subscribeSystemThemeChange(() => {
  applyGlobalThemePreference('system');
});

handleRoute();
