import type { MCBaseChart } from '../../../src/index';
import { CHART_CATALOG } from '../catalog';
import { GUIDES_CATALOG, type GuideId } from '../guides';
import { escapeHtml } from '../guides/shared';
import { getOrInitChartConfig } from '../state/config-store';
import { getGlobalThemeMode } from '../state/theme';

type HomeTabId = 'examples' | 'guides';

const HOME_TAB_STORAGE_KEY = 'modern-charts-studio-home-tab';

function readStoredHomeTab(): HomeTabId {
  try {
    return localStorage.getItem(HOME_TAB_STORAGE_KEY) === 'guides'
      ? 'guides'
      : 'examples';
  } catch {
    return 'examples';
  }
}

export function writeStoredHomeTab(tab: HomeTabId): void {
  try {
    localStorage.setItem(HOME_TAB_STORAGE_KEY, tab);
  } catch {
    // Ignore storage failures in restricted contexts
  }
}

const GUIDE_PREVIEW_SVGS: Record<GuideId | 'ai-context', string> = {
  'custom-layers': `
    <svg viewBox="0 0 220 96" fill="none" aria-hidden="true">
      <rect x="24" y="58" width="172" height="22" rx="6" fill="#6366f1" fill-opacity="0.22" stroke="#818cf8" stroke-width="1.5"/>
      <rect x="38" y="38" width="144" height="22" rx="6" fill="#06b6d4" fill-opacity="0.22" stroke="#22d3ee" stroke-width="1.5"/>
      <rect x="52" y="18" width="116" height="22" rx="6" fill="#10b981" fill-opacity="0.24" stroke="#34d399" stroke-width="1.5"/>
    </svg>`,
  themes: `
    <svg viewBox="0 0 220 96" fill="none" aria-hidden="true">
      <circle cx="46" cy="48" r="16" fill="#6366f1"/>
      <circle cx="78" cy="48" r="16" fill="#06b6d4"/>
      <circle cx="110" cy="48" r="16" fill="#10b981"/>
      <circle cx="142" cy="48" r="16" fill="#f59e0b"/>
      <circle cx="174" cy="48" r="16" fill="#f43f5e"/>
    </svg>`,
  d3: `
    <svg viewBox="0 0 220 96" fill="none" aria-hidden="true">
      <path d="M24 74 L196 74 M24 18 L24 74" stroke="currentColor" stroke-opacity="0.3" stroke-width="1.5"/>
      <path d="M30 66 C62 62, 78 24, 114 38 C146 50, 166 18, 192 24" stroke="#38bdf8" stroke-width="2.6" stroke-linecap="round"/>
      <circle cx="70" cy="40" r="4.5" fill="#a855f7"/>
      <circle cx="114" cy="38" r="4.5" fill="#38bdf8"/>
      <circle cx="162" cy="27" r="4.5" fill="#10b981"/>
    </svg>`,
  'custom-labels': `
    <svg viewBox="0 0 220 96" fill="none" aria-hidden="true">
      <rect x="26" y="28" width="76" height="36" rx="10" fill="#6366f1" fill-opacity="0.24" stroke="#818cf8" stroke-width="1.5"/>
      <circle cx="44" cy="46" r="5" fill="#38bdf8"/>
      <rect x="56" y="42" width="34" height="8" rx="4" fill="currentColor" fill-opacity="0.65"/>
      <rect x="118" y="28" width="76" height="36" rx="10" fill="#10b981" fill-opacity="0.22" stroke="#34d399" stroke-width="1.5"/>
      <circle cx="136" cy="46" r="5" fill="#f59e0b"/>
      <rect x="148" y="42" width="34" height="8" rx="4" fill="currentColor" fill-opacity="0.65"/>
    </svg>`,
  tooltips: `
    <svg viewBox="0 0 220 96" fill="none" aria-hidden="true">
      <rect x="28" y="52" width="24" height="28" rx="4" fill="#6366f1" fill-opacity="0.45"/>
      <rect x="62" y="36" width="24" height="44" rx="4" fill="#06b6d4"/>
      <rect x="100" y="16" width="92" height="48" rx="10" fill="currentColor" fill-opacity="0.08" stroke="#38bdf8" stroke-width="1.6"/>
      <circle cx="116" cy="34" r="4.5" fill="#06b6d4"/>
      <rect x="128" y="30" width="52" height="7" rx="3.5" fill="currentColor" fill-opacity="0.72"/>
      <rect x="114" y="46" width="46" height="6" rx="3" fill="currentColor" fill-opacity="0.38"/>
    </svg>`,
  accessibility: `
    <svg viewBox="0 0 220 96" fill="none" aria-hidden="true">
      <rect x="28" y="20" width="76" height="56" rx="10" fill="#10b981" fill-opacity="0.16" stroke="#34d399" stroke-width="1.6"/>
      <rect x="40" y="46" width="14" height="20" rx="3" fill="#34d399"/>
      <rect x="60" y="34" width="14" height="32" rx="3" fill="#06b6d4"/>
      <rect x="80" y="40" width="14" height="26" rx="3" fill="#818cf8"/>
      <rect x="118" y="20" width="74" height="56" rx="10" fill="currentColor" fill-opacity="0.06" stroke="#94a3b8" stroke-dasharray="4 3" stroke-width="1.5"/>
      <rect x="130" y="46" width="14" height="20" rx="3" fill="#94a3b8" fill-opacity="0.55"/>
      <rect x="150" y="34" width="14" height="32" rx="3" fill="#94a3b8" fill-opacity="0.55"/>
      <rect x="170" y="40" width="14" height="26" rx="3" fill="#94a3b8" fill-opacity="0.55"/>
    </svg>`,
  'chart-state': `
    <svg viewBox="0 0 220 96" fill="none" aria-hidden="true">
      <rect x="28" y="16" width="164" height="64" rx="10" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.22" stroke-width="1.4" stroke-dasharray="4 4"/>
      <circle cx="84" cy="48" r="14" stroke="#6366f1" stroke-opacity="0.25" stroke-width="3"/>
      <path d="M84 34 A14 14 0 0 1 98 48" stroke="#6366f1" stroke-width="3" stroke-linecap="round"/>
      <rect x="112" y="38" width="56" height="7" rx="3.5" fill="currentColor" fill-opacity="0.72"/>
      <rect x="112" y="51" width="40" height="6" rx="3" fill="currentColor" fill-opacity="0.38"/>
    </svg>`,
  'ai-context': `
    <svg viewBox="0 0 220 96" fill="none" aria-hidden="true">
      <rect x="34" y="18" width="152" height="60" rx="10" fill="currentColor" fill-opacity="0.06" stroke="#a855f7" stroke-opacity="0.6" stroke-width="1.5"/>
      <rect x="52" y="32" width="60" height="7" rx="3.5" fill="#a855f7" fill-opacity="0.85"/>
      <rect x="52" y="46" width="114" height="6" rx="3" fill="currentColor" fill-opacity="0.42"/>
      <rect x="52" y="58" width="86" height="6" rx="3" fill="#38bdf8" fill-opacity="0.65"/>
    </svg>`
};

function createGuidesGrid(): HTMLElement {
  const guidesGrid = document.createElement('section');
  guidesGrid.className = 'overview-guides-grid';

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
      title: g.title,
      summary: g.summary
    })),
    {
      id: 'ai-context',
      href: './llms.txt',
      external: true,
      icon: '🤖',
      title: 'AI Context (llms.txt)',
      summary:
        'Machine-readable llms.txt index, full reference, per-chart specs, and JSON schema for coding agents.'
    }
  ];

  cards.forEach((item) => {
    const link = document.createElement('a');
    link.className = 'overview-guide-card';
    link.href = item.href;
    if (item.external) {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }
    link.innerHTML = `
      <div class="overview-guide-card-header">
        <h3 class="overview-guide-card-title">${item.icon} ${escapeHtml(item.title)}</h3>
        <span class="overview-guide-arrow" aria-hidden="true">${item.external ? '↗' : '→'}</span>
      </div>
      <div class="overview-guide-preview">
        ${GUIDE_PREVIEW_SVGS[item.id]}
      </div>
      <p class="overview-guide-summary">${escapeHtml(item.summary)}</p>
    `;
    guidesGrid.appendChild(link);
  });

  return guidesGrid;
}

/**
 * Renders the Home Overview page (`#/`) with a clean two-tab interface:
 * - Tab 1: Chart Examples (all 10 live interactive preview cards)
 * - Tab 2: Guides & Resources (all documentation guides + AI Context)
 * Returns the mounted chart elements so the theme switcher can update them in-place.
 */
export function renderOverviewPage(root: HTMLElement): MCBaseChart<any>[] {
  const mountedCharts: MCBaseChart<any>[] = [];
  root.innerHTML = '';

  const initialTab = readStoredHomeTab();
  const guideCount = GUIDES_CATALOG.length + 1;

  const tabsWrapper = document.createElement('div');
  tabsWrapper.className = 'overview-tabs';

  // Tablist bar
  const tablist = document.createElement('div');
  tablist.className = 'overview-tablist';
  tablist.setAttribute('role', 'tablist');
  tablist.setAttribute('focusgroup', 'tablist nomemory');
  tablist.setAttribute('aria-label', 'Studio sections');

  const createTabButton = (
    id: HomeTabId,
    label: string,
    count: number,
    selected: boolean
  ): HTMLButtonElement => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = `overview-tab-${id}`;
    btn.className = 'overview-tab';
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', String(selected));
    btn.tabIndex = selected ? 0 : -1;
    if (selected) {
      btn.setAttribute('focusgroupstart', '');
    }
    btn.dataset.tabId = id;
    btn.innerHTML = `
      <span class="overview-tab-label">${escapeHtml(label)}</span>
      <span class="overview-tab-count">${count}</span>
    `;
    return btn;
  };

  const examplesTab = createTabButton(
    'examples',
    'Chart Types',
    CHART_CATALOG.length,
    initialTab === 'examples'
  );
  const guidesTab = createTabButton(
    'guides',
    'Guides & Resources',
    guideCount,
    initialTab === 'guides'
  );
  tablist.append(examplesTab, guidesTab);

  // Shared grid cell container so hidden="until-found" panels never add empty gap space
  const panelsContainer = document.createElement('div');
  panelsContainer.className = 'overview-tabpanels';

  // Panel 1: Chart Examples
  const examplesPanel = document.createElement('div');
  examplesPanel.className = 'overview-tabpanel';
  examplesPanel.setAttribute('role', 'tabpanel');
  examplesPanel.setAttribute('aria-labelledby', examplesTab.id);
  if (initialTab !== 'examples') {
    (examplesPanel as any).hidden = 'until-found';
  }

  const examplesGrid = document.createElement('section');
  examplesGrid.className = 'overview-grid';

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

    examplesGrid.appendChild(card);

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

  examplesPanel.appendChild(examplesGrid);

  // Panel 2: Guides & Resources
  const guidesPanel = document.createElement('div');
  guidesPanel.className = 'overview-tabpanel';
  guidesPanel.setAttribute('role', 'tabpanel');
  guidesPanel.setAttribute('aria-labelledby', guidesTab.id);
  if (initialTab !== 'guides') {
    (guidesPanel as any).hidden = 'until-found';
  }
  guidesPanel.appendChild(createGuidesGrid());

  panelsContainer.append(examplesPanel, guidesPanel);
  tabsWrapper.append(tablist, panelsContainer);
  root.appendChild(tabsWrapper);

  const tabs: Array<{ id: HomeTabId; btn: HTMLButtonElement; panel: HTMLElement }> = [
    { id: 'examples', btn: examplesTab, panel: examplesPanel },
    { id: 'guides', btn: guidesTab, panel: guidesPanel }
  ];

  const selectTab = (nextId: HomeTabId): void => {
    writeStoredHomeTab(nextId);
    for (const item of tabs) {
      const isSelected = item.id === nextId;
      item.btn.setAttribute('aria-selected', String(isSelected));
      item.btn.tabIndex = isSelected ? 0 : -1;
      item.btn.toggleAttribute('focusgroupstart', isSelected);
      if (isSelected) {
        item.panel.hidden = false;
      } else {
        (item.panel as any).hidden = 'until-found';
      }
    }
    const activeBtn = tabs.find((t) => t.id === nextId)?.btn;
    activeBtn?.scrollIntoView({ block: 'nearest', inline: 'nearest' });

    // Re-render overview charts once Examples becomes visible so responsive widths are exact
    if (nextId === 'examples') {
      requestAnimationFrame(() => {
        mountedCharts.forEach((chart) => {
          if (typeof chart.render === 'function') chart.render();
        });
      });
    }
  };

  // Click activation + keyboard roving fallback (ArrowLeft/Right/Home/End) for browsers without focusgroup
  tabs.forEach((item, idx) => {
    item.btn.addEventListener('click', () => {
      selectTab(item.id);
    });

    item.btn.addEventListener('keydown', (e) => {
      let targetIdx: number | null = null;
      if (e.key === 'ArrowRight') {
        targetIdx = (idx + 1) % tabs.length;
      } else if (e.key === 'ArrowLeft') {
        targetIdx = (idx - 1 + tabs.length) % tabs.length;
      } else if (e.key === 'Home') {
        targetIdx = 0;
      } else if (e.key === 'End') {
        targetIdx = tabs.length - 1;
      }
      if (targetIdx !== null) {
        e.preventDefault();
        tabs[targetIdx].btn.focus();
      }
    });

    // Sync tab state automatically if browser Find-in-Page matches content in a hidden="until-found" panel
    item.panel.addEventListener('beforematch', () => {
      selectTab(item.id);
    });
  });

  return mountedCharts;
}
