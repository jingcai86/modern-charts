import type { MCBaseChart } from '../../../src/index';
import { CHART_CATALOG } from '../catalog';
import { getOrInitChartConfig } from '../state/config-store';
import { getGlobalThemeMode } from '../state/theme';

/**
 * Renders the Home Overview Gallery (`#/`) displaying live interactive preview cards
 * for all 10 charts. Returns the mounted chart elements so the theme switcher can
 * update them in-place without re-mounting.
 */
export function renderOverviewPage(root: HTMLElement): MCBaseChart<any>[] {
  const mountedCharts: MCBaseChart<any>[] = [];
  root.innerHTML = '';

  const navOverviewBtn = document.getElementById('nav-overview-btn');
  navOverviewBtn?.classList.add('active');

  const grid = document.createElement('section');
  grid.className = 'overview-grid';

  CHART_CATALOG.forEach((entry) => {
    const card = document.createElement('article');
    card.className = 'overview-card';
    card.setAttribute('role', 'link');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `Open ${entry.title}`);

    card.innerHTML = `
      <div class="overview-card-header">
        <h3 class="overview-card-title">${entry.title}</h3>
      </div>
      <div class="overview-preview-stage" id="preview-stage-${entry.id}"></div>
    `;

    const navigateToChart = () => {
      window.location.hash = `#/chart/${entry.id}`;
    };

    card.addEventListener('click', navigateToChart);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        navigateToChart();
      }
    });

    grid.appendChild(card);

    // Mount live chart instance inside preview stage (without zoom overlay controls on home cards)
    const stage = card.querySelector(
      `#preview-stage-${entry.id}`
    ) as HTMLElement;
    const chartEl = document.createElement(entry.tagName) as MCBaseChart<any>;
    const cfg = getOrInitChartConfig(entry);
    stage.appendChild(chartEl);
    chartEl.setConfig({
      ...cfg,
      themeMode: getGlobalThemeMode(),
      view: cfg.view ? { ...cfg.view, showControls: false } : undefined
    });
    mountedCharts.push(chartEl);
  });

  root.appendChild(grid);
  return mountedCharts;
}
