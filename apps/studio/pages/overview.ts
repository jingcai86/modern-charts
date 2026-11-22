import type { MCBaseChart } from '../../../src/index';
import { CHART_CATALOG } from '../catalog';
import { GUIDES_CATALOG, type GuideId } from '../guides';
import { escapeHtml } from '../guides/shared';
import { getOrInitChartConfig } from '../state/config-store';
import { getGlobalThemeMode } from '../state/theme';

const GUIDE_PREVIEW_SVGS: Record<GuideId | 'ai-context', string> = {
  'custom-layers': `
    <svg viewBox="0 0 180 64" fill="none" aria-hidden="true">
      <rect x="20" y="38" width="140" height="16" rx="5" fill="#6366f1" fill-opacity="0.22" stroke="#818cf8" stroke-width="1.4"/>
      <rect x="30" y="24" width="120" height="16" rx="5" fill="#06b6d4" fill-opacity="0.22" stroke="#22d3ee" stroke-width="1.4"/>
      <rect x="40" y="10" width="100" height="16" rx="5" fill="#10b981" fill-opacity="0.24" stroke="#34d399" stroke-width="1.4"/>
    </svg>`,
  themes: `
    <svg viewBox="0 0 180 64" fill="none" aria-hidden="true">
      <circle cx="38" cy="32" r="13" fill="#6366f1"/>
      <circle cx="64" cy="32" r="13" fill="#06b6d4"/>
      <circle cx="90" cy="32" r="13" fill="#10b981"/>
      <circle cx="116" cy="32" r="13" fill="#f59e0b"/>
      <circle cx="142" cy="32" r="13" fill="#f43f5e"/>
    </svg>`,
  d3: `
    <svg viewBox="0 0 180 64" fill="none" aria-hidden="true">
      <path d="M18 50 L162 50 M18 12 L18 50" stroke="currentColor" stroke-opacity="0.3" stroke-width="1.4"/>
      <path d="M22 44 C48 42, 62 16, 92 26 C118 34, 134 12, 158 16" stroke="#38bdf8" stroke-width="2.4" stroke-linecap="round"/>
      <circle cx="56" cy="28" r="3.5" fill="#a855f7"/>
      <circle cx="92" cy="26" r="3.5" fill="#38bdf8"/>
      <circle cx="132" cy="18" r="3.5" fill="#10b981"/>
    </svg>`,
  'custom-labels': `
    <svg viewBox="0 0 180 64" fill="none" aria-hidden="true">
      <rect x="24" y="18" width="60" height="26" rx="8" fill="#6366f1" fill-opacity="0.24" stroke="#818cf8" stroke-width="1.4"/>
      <circle cx="38" cy="31" r="4" fill="#38bdf8"/>
      <rect x="48" y="28" width="26" height="6" rx="3" fill="currentColor" fill-opacity="0.65"/>
      <rect x="96" y="18" width="60" height="26" rx="8" fill="#10b981" fill-opacity="0.22" stroke="#34d399" stroke-width="1.4"/>
      <circle cx="110" cy="31" r="4" fill="#f59e0b"/>
      <rect x="120" y="28" width="26" height="6" rx="3" fill="currentColor" fill-opacity="0.65"/>
    </svg>`,
  tooltips: `
    <svg viewBox="0 0 180 64" fill="none" aria-hidden="true">
      <rect x="26" y="34" width="18" height="20" rx="3" fill="#6366f1" fill-opacity="0.45"/>
      <rect x="52" y="24" width="18" height="30" rx="3" fill="#06b6d4"/>
      <rect x="82" y="10" width="76" height="36" rx="8" fill="currentColor" fill-opacity="0.08" stroke="#38bdf8" stroke-width="1.5"/>
      <circle cx="94" cy="23" r="3.5" fill="#06b6d4"/>
      <rect x="103" y="20" width="44" height="5" rx="2.5" fill="currentColor" fill-opacity="0.7"/>
      <rect x="92" y="32" width="36" height="4" rx="2" fill="currentColor" fill-opacity="0.38"/>
    </svg>`,
  'ai-context': `
    <svg viewBox="0 0 180 64" fill="none" aria-hidden="true">
      <rect x="28" y="12" width="124" height="40" rx="8" fill="currentColor" fill-opacity="0.06" stroke="#a855f7" stroke-opacity="0.6" stroke-width="1.4"/>
      <rect x="42" y="22" width="48" height="5" rx="2.5" fill="#a855f7" fill-opacity="0.85"/>
      <rect x="42" y="31" width="92" height="4" rx="2" fill="currentColor" fill-opacity="0.4"/>
      <rect x="42" y="39" width="70" height="4" rx="2" fill="#38bdf8" fill-opacity="0.65"/>
    </svg>`
};

const GUIDES_DOCK_STORAGE_KEY = 'modern-charts-studio-guides-open';

function readStoredGuidesOpen(): boolean {
  try {
    return localStorage.getItem(GUIDES_DOCK_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function writeStoredGuidesOpen(open: boolean): void {
  try {
    localStorage.setItem(GUIDES_DOCK_STORAGE_KEY, String(open));
  } catch {
    // Ignore storage failures in restricted contexts
  }
}

function createOverviewGuidesDock(grid: HTMLElement): HTMLElement {
  const cards: Array<{
    id: GuideId | 'ai-context';
    href: string;
    external?: boolean;
    icon: string;
    title: string;
    summary: string;
  }> = [
    ...GUIDES_CATALOG.map((g) => ({
      id: g.id,
      href: `#/guide/${g.id}`,
      icon: g.icon,
      title: g.shortLabel,
      summary: g.summary
    })),
    {
      id: 'ai-context',
      href: './llms.txt',
      external: true,
      icon: '🤖',
      title: 'AI Context',
      summary:
        'Machine-readable llms.txt index, full reference, per-chart specs, and JSON schema for coding agents.'
    }
  ];

  const dock = document.createElement('aside');
  dock.className = 'overview-guides-dock';
  dock.setAttribute('aria-label', 'Chart Guides and Resources');

  const initialOpen = readStoredGuidesOpen();

  dock.innerHTML = `
    <div class="overview-guides-dock-bar">
      <button
        type="button"
        class="overview-guides-dock-toggle"
        aria-expanded="${initialOpen}"
        aria-controls="overview-guides-drawer-panel"
      >
        <span>All Chart Guides</span>
        <span class="overview-guides-dock-count">${cards.length}</span>
        <span class="overview-guides-dock-chevron" aria-hidden="true">▲</span>
      </button>
    </div>
    <div
      id="overview-guides-drawer-panel"
      class="overview-guides-drawer-panel${initialOpen ? ' is-expanded' : ''}"
      ${initialOpen ? '' : 'hidden'}
    >
      <div class="overview-guides-drawer-inner">
        <div class="overview-guides-grid"></div>
      </div>
    </div>
  `;

  if (initialOpen) {
    dock.classList.add('is-expanded');
    grid.classList.add('has-guides-dock-open');
  }

  const toggleBtn = dock.querySelector(
    '.overview-guides-dock-toggle'
  ) as HTMLButtonElement;
  const panel = dock.querySelector(
    '#overview-guides-drawer-panel'
  ) as HTMLElement;
  const guidesGrid = dock.querySelector('.overview-guides-grid') as HTMLElement;

  cards.forEach((item) => {
    const link = document.createElement('a');
    link.className = 'overview-guide-card';
    link.href = item.href;
    if (item.external) {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }
    link.innerHTML = `
      <div class="overview-guide-preview">
        ${GUIDE_PREVIEW_SVGS[item.id]}
      </div>
      <div class="overview-guide-copy">
        <div class="overview-guide-card-header">
          <span class="overview-guide-card-title">${item.icon} ${escapeHtml(item.title)}</span>
          <span class="overview-guide-arrow" aria-hidden="true">${item.external ? '↗' : '→'}</span>
        </div>
        <p class="overview-guide-summary">${escapeHtml(item.summary)}</p>
      </div>
    `;
    guidesGrid.appendChild(link);
  });

  const setExpanded = (nextOpen: boolean): void => {
    writeStoredGuidesOpen(nextOpen);
    toggleBtn.setAttribute('aria-expanded', String(nextOpen));
    dock.classList.toggle('is-expanded', nextOpen);
    grid.classList.toggle('has-guides-dock-open', nextOpen);

    if (nextOpen) {
      panel.hidden = false;
      // Flush hidden removal before toggling class so CSS block-size transition runs smoothly
      void panel.offsetHeight;
      panel.classList.add('is-expanded');
    } else {
      panel.classList.remove('is-expanded');
      const transitions =
        typeof panel.getAnimations === 'function'
          ? panel
              .getAnimations()
              .filter(
                (anim) =>
                  typeof CSSTransition !== 'undefined' &&
                  anim instanceof CSSTransition
              )
          : [];
      if (transitions.length === 0) {
        panel.hidden = true;
      } else {
        Promise.allSettled(transitions.map((t) => t.finished)).then(() => {
          if (!panel.classList.contains('is-expanded')) {
            panel.hidden = true;
          }
        });
      }
    }
  };

  toggleBtn.addEventListener('click', () => {
    const isCurrentlyOpen = toggleBtn.getAttribute('aria-expanded') === 'true';
    setExpanded(!isCurrentlyOpen);
  });

  dock.addEventListener('keydown', (e) => {
    if (
      e.key === 'Escape' &&
      toggleBtn.getAttribute('aria-expanded') === 'true'
    ) {
      setExpanded(false);
      toggleBtn.focus();
    }
  });

  return dock;
}

/**
 * Renders the Home Overview Gallery (`#/`) displaying live interactive preview cards
 * for all 10 charts plus a compact bottom grid of Guides & Resources preview cards.
 * Returns the mounted chart elements so the theme switcher can update them in-place.
 */
export function renderOverviewPage(root: HTMLElement): MCBaseChart<any>[] {
  const mountedCharts: MCBaseChart<any>[] = [];
  root.innerHTML = '';

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
        <h3 class="overview-card-title">${escapeHtml(entry.title)}</h3>
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

    // Mount live chart instance inside preview stage (without zoom overlay controls or axis titles on home cards)
    const stage = card.querySelector(
      `#preview-stage-${entry.id}`
    ) as HTMLElement;
    const chartEl = document.createElement(entry.tagName) as MCBaseChart<any>;
    const cfg = getOrInitChartConfig(entry);
    stage.appendChild(chartEl);
    chartEl.setConfig({
      ...cfg,
      themeMode: getGlobalThemeMode(),
      xTitle: undefined,
      yTitle: undefined,
      view: cfg.view ? { ...cfg.view, showControls: false } : undefined
    });
    mountedCharts.push(chartEl);
  });

  root.appendChild(grid);
  root.appendChild(createOverviewGuidesDock(grid));
  return mountedCharts;
}
