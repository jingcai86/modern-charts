import type { MCBaseChart } from '../../../src/index';
import { CHART_CATALOG, type ChartCatalogEntry } from '../catalog';
import { loadChart } from '../chart-loader';
import { GUIDES_CATALOG, type GuideId } from '../guides/types';
import { escapeHtml } from '../utils/html';
import { getOrInitChartConfig } from '../state/config-store';
import { getGlobalThemeMode } from '../state/theme';

type HomeTabId = 'examples' | 'guides';

const HOME_TAB_STORAGE_KEY = 'modern-charts-studio-home-tab';
const overviewCleanups = new WeakMap<HTMLElement, () => void>();

export function disposeOverviewPage(root: HTMLElement): void {
  overviewCleanups.get(root)?.();
  overviewCleanups.delete(root);
}

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
  truncation: `
    <svg viewBox="0 0 220 96" fill="none" aria-hidden="true">
      <rect x="26" y="22" width="168" height="22" rx="6" fill="#6366f1" fill-opacity="0.18" stroke="#818cf8" stroke-width="1.5"/>
      <rect x="38" y="30" width="92" height="6" rx="3" fill="currentColor" fill-opacity="0.65"/>
      <circle cx="142" cy="33" r="2.2" fill="#38bdf8"/>
      <circle cx="150" cy="33" r="2.2" fill="#38bdf8"/>
      <circle cx="158" cy="33" r="2.2" fill="#38bdf8"/>
      <line x1="56" y1="68" x2="108" y2="54" stroke="#10b981" stroke-width="3" stroke-linecap="round"/>
      <line x1="118" y1="68" x2="170" y2="54" stroke="#f59e0b" stroke-width="3" stroke-linecap="round"/>
    </svg>`,
  events: `
    <svg viewBox="0 0 220 96" fill="none" aria-hidden="true">
      <circle cx="66" cy="48" r="24" stroke="#38bdf8" stroke-opacity="0.35" stroke-width="1.5"/>
      <circle cx="66" cy="48" r="14" stroke="#38bdf8" stroke-opacity="0.7" stroke-width="1.5"/>
      <circle cx="66" cy="48" r="5" fill="#f59e0b"/>
      <rect x="108" y="22" width="84" height="14" rx="5" fill="#6366f1" fill-opacity="0.24" stroke="#818cf8" stroke-width="1.2"/>
      <rect x="108" y="42" width="84" height="14" rx="5" fill="#06b6d4" fill-opacity="0.22" stroke="#22d3ee" stroke-width="1.2"/>
      <rect x="108" y="62" width="84" height="14" rx="5" fill="#10b981" fill-opacity="0.22" stroke="#34d399" stroke-width="1.2"/>
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
  'auto-size': `
    <svg viewBox="0 0 220 96" fill="none" aria-hidden="true">
      <rect x="40" y="18" width="140" height="60" rx="8" fill="#6366f1" fill-opacity="0.12" stroke="#818cf8" stroke-width="1.5"/>
      <rect x="58" y="29" width="104" height="38" rx="2" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="3 3"/>
      <path d="M68 58l25-12 25 4 32-13" stroke="#34d399" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M23 48h11m-11 0 4-4m-4 4 4 4m170-4h-11m11 0-4-4m4 4-4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
  ssr: `
    <svg viewBox="0 0 220 96" fill="none" aria-hidden="true">
      <rect x="24" y="25" width="64" height="47" rx="7" fill="#6366f1" fill-opacity="0.16" stroke="#818cf8" stroke-width="1.5"/>
      <path d="M36 39h40M36 49h40M36 59h40" stroke="#818cf8" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M97 48h25m-7-7 7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="132" y="25" width="64" height="47" rx="7" fill="#06b6d4" fill-opacity="0.12" stroke="#22d3ee" stroke-width="1.5"/>
      <path d="M145 60V49m12 11V40m12 20V45m12 15V35" stroke="#22d3ee" stroke-width="4" stroke-linecap="round"/>
    </svg>`,
  i18n: `
    <svg viewBox="0 0 220 96" fill="none" aria-hidden="true">
      <circle cx="62" cy="48" r="28" stroke="#38bdf8" stroke-width="1.8"/>
      <ellipse cx="62" cy="48" rx="13" ry="28" stroke="#38bdf8" stroke-width="1.4"/>
      <path d="M34 48 H90 M38 34 H86 M38 62 H86" stroke="#38bdf8" stroke-width="1.2"/>
      <rect x="110" y="18" width="84" height="25" rx="6" fill="#6366f1" fill-opacity="0.22"/>
      <text x="152" y="35" text-anchor="middle" fill="currentColor" font-size="13">1.234,56</text>
      <rect x="110" y="53" width="84" height="25" rx="6" fill="#10b981" fill-opacity="0.22"/>
      <text x="152" y="70" text-anchor="middle" fill="currentColor" font-size="13">١٬٢٣٤٫٥٦</text>
    </svg>`,
  'dynamic-updates': `
    <svg viewBox="0 0 220 96" fill="none" aria-hidden="true">
      <path d="M24 72 L196 72" stroke="currentColor" stroke-opacity="0.25" stroke-width="1.4"/>
      <path d="M28 60 L60 44 L92 52 L124 28 L156 38 L188 20" stroke="#38bdf8" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="188" cy="20" r="5" fill="#10b981"/>
      <circle cx="188" cy="20" r="10" stroke="#10b981" stroke-opacity="0.45" stroke-width="1.5"/>
      <path d="M28 66 L60 58 L92 60 L124 46 L156 50 L188 40" stroke="#a855f7" stroke-width="2" stroke-dasharray="4 3" stroke-linecap="round"/>
    </svg>`,
  'chart-state': `
    <svg viewBox="0 0 220 96" fill="none" aria-hidden="true">
      <rect x="28" y="16" width="164" height="64" rx="10" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.22" stroke-width="1.4" stroke-dasharray="4 4"/>
      <circle cx="84" cy="48" r="14" stroke="#6366f1" stroke-opacity="0.25" stroke-width="3"/>
      <path d="M84 34 A14 14 0 0 1 98 48" stroke="#6366f1" stroke-width="3" stroke-linecap="round"/>
      <rect x="112" y="38" width="56" height="7" rx="3.5" fill="currentColor" fill-opacity="0.72"/>
      <rect x="112" y="51" width="40" height="6" rx="3" fill="currentColor" fill-opacity="0.38"/>
    </svg>`,
  patterns: `
    <svg viewBox="0 0 220 96" fill="none" aria-hidden="true">
      <defs>
        <pattern id="ov-pat-lines" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
          <rect width="6" height="6" fill="#6366f1"/>
          <line x1="0" y1="3" x2="6" y2="3" stroke="white" stroke-opacity="0.5" stroke-width="1.6"/>
        </pattern>
        <pattern id="ov-pat-dots" width="7" height="7" patternUnits="userSpaceOnUse">
          <rect width="7" height="7" fill="#06b6d4"/>
          <circle cx="3.5" cy="3.5" r="1.4" fill="white" fill-opacity="0.65"/>
        </pattern>
        <linearGradient id="ov-pat-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#f59e0b"/>
          <stop offset="100%" stop-color="#ec4899"/>
        </linearGradient>
      </defs>
      <rect x="34" y="26" width="38" height="52" rx="6" fill="url(#ov-pat-lines)"/>
      <rect x="90" y="18" width="38" height="60" rx="6" fill="url(#ov-pat-dots)"/>
      <rect x="146" y="34" width="38" height="44" rx="6" fill="url(#ov-pat-grad)"/>
    </svg>`,
  'view-zoom': `
    <svg viewBox="0 0 220 96" fill="none" aria-hidden="true">
      <rect x="24" y="18" width="104" height="60" rx="8" fill="#0ea5e9" fill-opacity="0.14" stroke="#38bdf8" stroke-width="1.5"/>
      <path d="M40 58L64 38L88 46L112 28" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="164" cy="44" r="18" fill="#10b981" fill-opacity="0.18" stroke="#34d399" stroke-width="1.8"/>
      <path d="M158 44H170M164 38V50" stroke="#34d399" stroke-width="2" stroke-linecap="round"/>
      <path d="M177 57L190 70" stroke="#34d399" stroke-width="2.4" stroke-linecap="round"/>
    </svg>`,
  'csv-export': `
    <svg viewBox="0 0 220 96" fill="none" aria-hidden="true">
      <rect x="24" y="18" width="104" height="60" rx="8" fill="#0ea5e9" fill-opacity="0.14" stroke="#38bdf8" stroke-width="1.5"/>
      <path d="M40 34H112M40 48H112M40 62H88" stroke="currentColor" stroke-opacity="0.55" stroke-width="2" stroke-linecap="round"/>
      <rect x="142" y="24" width="54" height="48" rx="8" fill="#10b981" fill-opacity="0.16" stroke="#34d399" stroke-width="1.6"/>
      <path d="M169 36V56M161 48L169 56L177 48" stroke="#34d399" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
  bootstrapping: `
    <svg viewBox="0 0 220 96" fill="none" aria-hidden="true">
      <rect x="22" y="20" width="76" height="56" rx="8" fill="#6366f1" fill-opacity="0.14" stroke="#818cf8" stroke-width="1.5"/>
      <rect x="34" y="34" width="52" height="10" rx="5" fill="#818cf8" fill-opacity="0.35"/>
      <circle cx="42" cy="39" r="3.5" fill="#94a3b8"/>
      <rect x="34" y="52" width="52" height="10" rx="5" fill="#10b981" fill-opacity="0.3"/>
      <circle cx="78" cy="57" r="3.5" fill="#34d399"/>
      <path d="M106 48H126M120 42L126 48L120 54" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="134" y="20" width="64" height="56" rx="8" fill="#0ea5e9" fill-opacity="0.14" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="4 3"/>
      <path d="M152 54L164 38L176 46L184 34" stroke="#34d399" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
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
        <h2 class="overview-guide-card-title">${item.icon} ${escapeHtml(item.title)}</h2>
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
 * - Tab 1: Chart Examples (live previews mount as their cards approach the viewport)
 * - Tab 2: Guides & Resources (all documentation guides + AI Context)
 * The returned array is populated as previews mount so the theme switcher can update them in-place.
 */
export function renderOverviewPage(root: HTMLElement): MCBaseChart<any>[] {
  const mountedCharts: MCBaseChart<any>[] = [];
  disposeOverviewPage(root);
  root.replaceChildren();

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

  const previews = new Map<Element, { entry: ChartCatalogEntry; stage: HTMLElement }>();
  const nearbyCards = new Set<Element>();
  const loadingCards = new Set<Element>();
  const readyCards = new Set<Element>();
  let isDrainingQueue = false;
  let disposed = false;

  function canMount(card: Element): boolean {
    return !disposed && !examplesPanel.hidden && nearbyCards.has(card) && card.isConnected;
  }

  function mountChart(entry: ChartCatalogEntry, stage: HTMLElement): void {
    const chart = document.createElement(entry.tagName) as MCBaseChart<any>;
    // Prevent internal layer notifications during connection from drawing extra frames.
    chart.setAttribute('data-defer-initial-render', '');
    const cfg = getOrInitChartConfig(entry);
    chart.setConfig({
      ...cfg,
      themeMode: getGlobalThemeMode(),
      isInteractive: false,
      isFocusable: false,
      animate: false,
      labelMode: 'svg',
      xTitle: undefined,
      yTitle: undefined,
      view: cfg.view ? { ...cfg.view, showControls: false } : undefined
    });
    stage.appendChild(chart);
    mountedCharts.push(chart);
    chart.removeAttribute('data-defer-initial-render');
    chart.render();
  }

  async function yieldToMain(): Promise<void> {
    const g = globalThis as any;
    if (g.scheduler && typeof g.scheduler.yield === 'function') {
      await g.scheduler.yield();
      return;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }

  async function drainRenderQueue(): Promise<void> {
    if (isDrainingQueue || examplesPanel.hidden || disposed || readyCards.size === 0) return;
    isDrainingQueue = true;
    await new Promise<void>((resolve) => {
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => resolve());
      } else {
        setTimeout(resolve, 0);
      }
    });
    try {
      while (readyCards.size > 0) {
        await yieldToMain();
        if (examplesPanel.hidden || disposed) break;
        const card = readyCards.values().next().value;
        if (!card) break;
        readyCards.delete(card);
        const preview = previews.get(card);
        if (!preview || !canMount(card)) continue;
        finishPreview(card);
        mountChart(preview.entry, preview.stage);
      }
    } finally {
      isDrainingQueue = false;
    }
  }

  function finishPreview(card: Element): void {
    cardObserver?.unobserve(card);
    previews.delete(card);
    nearbyCards.delete(card);
  }

  function queuePreview(card: Element): void {
    if (!canMount(card) || !previews.has(card)) return;
    readyCards.add(card);
    void drainRenderQueue();
  }

  function loadPreview(card: Element): void {
    const preview = previews.get(card);
    if (!preview || !canMount(card) || loadingCards.has(card)) return;
    if (customElements.get(preview.entry.tagName)) {
      queuePreview(card);
      return;
    }

    loadingCards.add(card);
    void loadChart(preview.entry).then(
      () => {
        loadingCards.delete(card);
        queuePreview(card);
      },
      () => {
        loadingCards.delete(card);
        if (disposed || !card.isConnected) return;
        finishPreview(card);
        const message = document.createElement('p');
        message.className = 'overview-preview-message';
        message.textContent = 'Preview unavailable';
        preview.stage.appendChild(message);
      }
    );
  }

  const cardObserver =
    typeof IntersectionObserver === 'function'
      ? new IntersectionObserver(
          (entries) => {
            if (disposed || examplesPanel.hidden) return;
            for (const entry of entries) {
              if (entry.isIntersecting && previews.has(entry.target)) {
                nearbyCards.add(entry.target);
                loadPreview(entry.target);
              } else {
                nearbyCards.delete(entry.target);
                readyCards.delete(entry.target);
              }
            }
          },
          { rootMargin: '160px 0px' }
        )
      : null;
  overviewCleanups.set(root, () => {
    disposed = true;
    readyCards.clear();
    nearbyCards.clear();
    loadingCards.clear();
    previews.clear();
    cardObserver?.disconnect();
  });

  function observePreviews(): void {
    for (const card of previews.keys()) {
      if (cardObserver) {
        cardObserver.observe(card);
      } else {
        nearbyCards.add(card);
        loadPreview(card);
      }
    }
  }

  CHART_CATALOG.forEach((entry) => {
    const card = document.createElement('a');
    card.className = 'overview-card';
    card.href = `#/chart/${entry.id}`;
    card.setAttribute('aria-labelledby', `preview-title-${entry.id}`);

    card.innerHTML = `
      <div class="overview-card-header">
        <h2 class="overview-card-title" id="preview-title-${entry.id}">${escapeHtml(entry.title)}</h2>
      </div>
      <div class="overview-preview-stage" id="preview-stage-${entry.id}" aria-hidden="true"></div>
    `;

    examplesGrid.appendChild(card);

    const stage = card.querySelector(
      `#preview-stage-${entry.id}`
    ) as HTMLElement;
    previews.set(card, { entry, stage });
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
  if (initialTab === 'examples') observePreviews();

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
        if (disposed || examplesPanel.hidden) return;
        mountedCharts.forEach((chart) => {
          if (typeof chart.render === 'function') chart.render();
        });
      });
      observePreviews();
    } else {
      cardObserver?.disconnect();
      nearbyCards.clear();
      readyCards.clear();
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
