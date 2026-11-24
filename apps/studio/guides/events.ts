import type { MCBaseChart, ThemeModePreference } from '../../../src/index';
import { createLiveConfigEditor } from './shared';

export function renderEventsGuide(
  container: HTMLElement,
  themeMode: ThemeModePreference
): MCBaseChart<any>[] {
  const mounted: MCBaseChart<any>[] = [];

  // Intro & Event Taxonomy
  const intro = document.createElement('section');
  intro.className = 'panel-card guide-section';
  intro.innerHTML = `
    <h2 class="panel-title">Chart Events &amp; Interaction Lifecycle</h2>
    <p class="guide-prose">
      Every <code>modern-charts</code> Web Component dispatches standard, composed DOM <code>CustomEvent</code>s
      (<code>bubbles: true, composed: true</code>) that cross Shadow DOM boundaries cleanly so you can listen via
      <code>chart.addEventListener(...)</code> in Vanilla JS, React, Vue, Angular, or Svelte.
    </p>
    <div class="guide-table-wrap">
      <table class="guide-table">
        <thead>
          <tr>
            <th>Event Name</th>
            <th>Emitting Target</th>
            <th><code>event.detail</code> Payload</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>mc-tooltip-show</code> / <code>mc-tooltip-hide</code></td>
            <td>Data items, truncated labels, marker annotations</td>
            <td><code>TooltipPayload</code> (<code>chartType</code>, <code>seriesId</code>, <code>category</code>, <code>value</code>, <code>datum</code>, <code>positionMode</code>, <code>source</code>, <code>clientX</code>, <code>clientY</code>)</td>
          </tr>
          <tr>
            <td><code>mc-legend-tooltip-show</code> / <code>mc-legend-tooltip-hide</code></td>
            <td>Legend entries (series &amp; marker legends)</td>
            <td><code>TooltipPayload&lt;LegendItem&gt;</code> (<code>title</code>, <code>seriesId</code>, <code>color</code>, <code>datum</code>)</td>
          </tr>
          <tr>
            <td><code>mc-aria-focus</code></td>
            <td>Keyboard-focused chart items (<code>Tab</code> / Arrow keys)</td>
            <td><code>{ item, label, description, chartType }</code></td>
          </tr>
          <tr>
            <td><code>mc-item-activate</code></td>
            <td>Keyboard activation (<code>Enter</code> / <code>Space</code>) on focused item</td>
            <td><code>{ item, label, chartType }</code></td>
          </tr>
          <tr>
            <td><code>mc-zoom</code></td>
            <td>Pan/zoom viewport (<code>wheel</code>, drag, or <code>+</code>/<code>−</code>/<code>Reset</code> controls)</td>
            <td><code>{ k, x, y }</code></td>
          </tr>
          <tr>
            <td><code>mc-layer-rendered</code></td>
            <td>Each layer mounted during render or AI progressive streaming</td>
            <td><code>{ layerName, index, total, chartType }</code></td>
          </tr>
          <tr>
            <td><code>mc-event</code> / <code>mc-&lt;type&gt;</code> / <code>mc-&lt;target&gt;-&lt;type&gt;</code></td>
            <td>Unified Event System (#49): items, axes, legends, markers, titles, and empty canvas (<code>data: undefined</code>)</td>
            <td><code>ChartEventPayload</code> (<code>type</code>, <code>target</code>, <code>category</code>, <code>data</code>, <code>element</code>, <code>chartX</code>, <code>chartY</code>)</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
  container.appendChild(intro);

  // Example 1: Live Event-Log Demo + Live Editable Config
  const ex1 = document.createElement('section');
  ex1.className = 'panel-card guide-section';
  ex1.innerHTML = `
    <div class="panel-header">
      <div>
        <h2 class="panel-title">Live Interactive Event Log &amp; Editable Chart Config</h2>
        <p class="guide-prose" style="margin:4px 0 0;">
          Hover bars, click axis labels or empty canvas, hover legends or the SLA marker, press <strong>Tab + Enter</strong>,
          or edit <code>data</code>, <code>markers</code>, <code>view</code>, and <code>isInteractive</code> in the live JSON editor below.
        </p>
      </div>
      <div class="guide-controls-row">
        <button type="button" id="btn-clear-event-log">Clear Log</button>
      </div>
    </div>
    <div class="guide-example-grid">
      <div class="guide-chart-stage" id="guide-events-chart-1"></div>
      <div style="display:flex;flex-direction:column;gap:10px;min-width:0;">
        <div class="inspector-box" style="flex:1;min-height:240px;max-height:360px;overflow-y:auto;">
          <div class="inspector-title">Event Stream (newest first):</div>
          <div id="guide-events-log-list" class="inspector-readout" style="display:flex;flex-direction:column;gap:6px;white-space:pre-wrap;overflow-wrap:anywhere;">
            Interact with the chart on the left to record events...
          </div>
        </div>
      </div>
    </div>
    <div id="guide-events-code-1" style="margin-top:14px;"></div>
  `;
  container.appendChild(ex1);

  const bar = document.createElement('mc-bar-chart') as MCBaseChart<any>;
  ex1.querySelector('#guide-events-chart-1')!.appendChild(bar);
  mounted.push(bar);

  const logList = ex1.querySelector('#guide-events-log-list') as HTMLElement;
  const clearBtn = ex1.querySelector('#btn-clear-event-log') as HTMLButtonElement;
  const entries: string[] = [];

  const pushLog = (name: string, summary: string) => {
    const ts = new Date().toLocaleTimeString([], {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    entries.unshift(`[${ts}] ${name} — ${summary}`);
    if (entries.length > 25) entries.pop();
    logList.textContent = entries.join('\n');
  };

  clearBtn.addEventListener('click', () => {
    entries.length = 0;
    logList.textContent = 'Log cleared. Interact with the chart to record events...';
  });

  bar.addEventListener('mc-tooltip-show', (e: Event) => {
    const d = (e as CustomEvent).detail ?? {};
    pushLog(
      'mc-tooltip-show',
      `series="${d.seriesId ?? d.label ?? ''}" category="${
        d.category ?? d.title ?? ''
      }" value=${d.formattedValue ?? d.value ?? ''} source=${d.source ?? 'pointer'}`
    );
  });
  bar.addEventListener('mc-tooltip-hide', () => {
    pushLog('mc-tooltip-hide', 'tooltip hidden');
  });
  bar.addEventListener('mc-legend-tooltip-show', (e: Event) => {
    const d = (e as CustomEvent).detail ?? {};
    pushLog('mc-legend-tooltip-show', `legend="${d.title ?? d.seriesId ?? ''}"`);
  });
  bar.addEventListener('mc-aria-focus', (e: Event) => {
    const d = (e as CustomEvent).detail ?? {};
    pushLog('mc-aria-focus', `label="${d.label ?? ''}"`);
  });
  bar.addEventListener('mc-item-activate', (e: Event) => {
    const d = (e as CustomEvent).detail ?? {};
    pushLog('mc-item-activate', `activated="${d.label ?? ''}"`);
  });
  bar.addEventListener('mc-zoom', (e: Event) => {
    const d = (e as CustomEvent).detail ?? {};
    pushLog(
      'mc-zoom',
      `k=${Number(d.k ?? 1).toFixed(2)} x=${Math.round(d.x ?? 0)} y=${Math.round(
        d.y ?? 0
      )}`
    );
  });
  bar.addEventListener('mc-event', (e: Event) => {
    const d = (e as CustomEvent).detail ?? {};
    if (d.type === 'click') {
      pushLog(
        `mc-event (click)`,
        `target="${d.target}" category="${d.category}" data=${
          d.data === undefined
            ? 'undefined'
            : JSON.stringify(d.data.id ?? d.data.label ?? d.data.value ?? 'ok')
        }`
      );
    }
  });

  const initialEventsCfg = {
    title: 'Interactive Event Playground',
    palette: 'modern',
    indexBy: 'quarter',
    keys: ['Cloud', 'Edge'],
    isInteractive: true,
    isFocusable: true,
    borderRadius: 6,
    view: { zoomable: true, pannable: true, showControls: true },
    markers: [
      {
        id: 'target-sla',
        axis: 'y' as const,
        value: 150,
        label: 'Target 150',
        stroke: '#f43f5e',
        annotation: { text: 'SLA 150', position: 'right' as const }
      }
    ],
    data: [
      { quarter: 'Q1', Cloud: 142, Edge: 96 },
      { quarter: 'Q2', Cloud: 178, Edge: 118 },
      { quarter: 'Q3', Cloud: 196, Edge: 134 },
      { quarter: 'Q4', Cloud: 235, Edge: 162 }
    ]
  };

  const applyEventsCfg = (cfg: Record<string, any>) => {
    bar.setConfig({
      autoSize: true,
      themeMode,
      margin: { top: 44, right: 64, bottom: 72, left: 52 },
      layers: ['grid', 'axes', 'bars', 'markers', 'labels', 'legends'],
      ...cfg
    });
  };
  applyEventsCfg(initialEventsCfg);

  const editor1 = createLiveConfigEditor({
    title: 'Interactive Event Playground Config (Live)',
    initialConfig: initialEventsCfg,
    hint: 'Edit data, markers, view.zoomable, or toggle isInteractive: false and watch the live event log respond.',
    onConfigChange: applyEventsCfg
  });
  ex1.querySelector('#guide-events-code-1')!.appendChild(editor1.element);

  return mounted;
}
