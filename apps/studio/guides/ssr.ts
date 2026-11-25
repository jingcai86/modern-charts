import type { BarDatum, ChartConfig, MCBarChart, ThemeModePreference } from '../../../src/index';
import { getGlobalPalette } from '../state/theme';
import { createCodeBlock, createLiveConfigEditor } from './shared';

const salesMarkup = `
<h1>Quarterly sales</h1>
<table id="sales-data">
  <caption>Sales by quarter</caption>
  <thead>
    <tr><th scope="col">Quarter</th><th scope="col">Sales</th></tr>
  </thead>
  <tbody>
    <tr><th scope="row">Q1</th><td>42</td></tr>
    <tr><th scope="row">Q2</th><td>55</td></tr>
  </tbody>
</table>
<mc-bar-chart
  id="sales-chart"
  style="display:block;width:100%;height:18rem"
></mc-bar-chart>
<script type="module" src="/assets/sales-chart.js"></script>
`;

const salesBrowserModule = `
// Bundle this file for the browser.
import 'modern-charts/bar';

const data = Array.from(
  document.querySelectorAll('#sales-data tbody tr'),
  (row) => ({
    quarter: row.cells[0].textContent.trim(),
    sales: Number(row.cells[1].textContent)
  })
);

document.getElementById('sales-chart').config = {
  data,
  indexBy: 'quarter',
  keys: ['sales'],
  autoSize: true,
  ariaLabel: 'Quarterly sales',
  aria: { includeDataTable: false }
};
`;

const salesClientComponent = `
'use client';

import { createElement, useEffect, useRef } from 'react';
import type { MCBarChart } from 'modern-charts/bar';

type SalesRow = { quarter: string; sales: number };

export function SalesChart({ data }: { data: SalesRow[] }) {
  const chart = useRef<MCBarChart>(null);

  useEffect(() => {
    let active = true;
    import('modern-charts/bar').then(() => {
      if (!active || !chart.current) return;
      chart.current.config = {
        data,
        indexBy: 'quarter',
        keys: ['sales'],
        autoSize: true,
        ariaLabel: 'Quarterly sales',
        aria: { includeDataTable: false }
      };
    }).catch((error) => {
      if (active) console.error('Unable to load the sales chart', error);
    });

    return () => { active = false; };
  }, [data]);

  return createElement('mc-bar-chart', {
    ref: chart,
    style: { display: 'block', width: '100%', height: '18rem' }
  });
}
`;

const salesServerPage = `
import { SalesChart } from './sales-chart';

export default function Page() {
  const data = [{ quarter: 'Q1', sales: 42 }, { quarter: 'Q2', sales: 55 }];

  return (
    <main>
      <h1>Quarterly sales</h1>
      <table>
        <caption>Sales by quarter</caption>
        <thead>
          <tr><th scope="col">Quarter</th><th scope="col">Sales</th></tr>
        </thead>
        <tbody>
          {data.map(({ quarter, sales }) => (
            <tr key={quarter}><th scope="row">{quarter}</th><td>{sales}</td></tr>
          ))}
        </tbody>
      </table>
      <SalesChart data={data} />
    </main>
  );
}
`;

export function renderSsrGuide(
  container: HTMLElement,
  themeMode: ThemeModePreference
): MCBarChart[] {
  const html = document.createElement('section');
  html.className = 'panel-card guide-section';
  html.innerHTML = `
    <h2 class="panel-title">Serve HTML, then start the chart</h2>
    <p class="guide-prose">
      Install <code>modern-charts</code> with <code>npm install modern-charts</code>.
      The package can be imported on the server. The browser creates the chart's
      SVG when the custom element is registered and receives its configuration.
      Serve a sized chart host and an HTML table so the data is available before
      JavaScript loads and the layout stays steady.
    </p>
    <p class="guide-prose">
      Include the browser bundle's URL in the module script. This example reads
      raw numbers from the table. If your table formats its numbers, pass the
      original values separately.
    </p>
  `;
  html.append(
    createCodeBlock(salesMarkup, 'HTML from the server'),
    createCodeBlock(salesBrowserModule, 'sales-chart.js · browser entry')
  );

  const react = document.createElement('section');
  react.className = 'panel-card guide-section';
  react.innerHTML = `
    <h2 class="panel-title">Use a Client Component in Next.js</h2>
    <p class="guide-prose">
      Render the table in your page and pass its serializable rows to the chart
      component. The server can pre-render the chart host. Once React hydrates
      it, a browser effect imports the chart and assigns <code>chart.config</code>
      through a ref. Define formatter or event callbacks in the client component.
    </p>
    <p class="guide-prose">
      Studio automatically lazy-loads each chart module as its gallery preview
      approaches the viewport or when you open its playground. In your own app,
      call a dynamic import such as <code>import('modern-charts/bar')</code>
      when you need the chart.
    </p>
  `;
  react.append(
    createCodeBlock(salesServerPage, 'app/sales/page.tsx · server page'),
    createCodeBlock(salesClientComponent, 'app/sales/sales-chart.tsx · client component')
  );

  const preview = document.createElement('section');
  preview.className = 'panel-card guide-section';
  preview.innerHTML = `
    <h2 class="panel-title">Preview the browser result</h2>
    <p class="guide-prose">Edit the chart configuration to see the same data in the chart and fallback table.</p>
    <div class="guide-example-grid">
      <div class="guide-chart-stage"></div>
      <div class="ssr-config"></div>
    </div>
    <div class="guide-table-wrap">
      <table class="guide-table">
        <caption>Sales by quarter</caption>
        <thead></thead>
        <tbody></tbody>
      </table>
    </div>
  `;
  const chart = document.createElement('mc-bar-chart') as MCBarChart;
  chart.style.cssText = 'display:block;width:100%;height:100%';
  preview.querySelector('.guide-chart-stage')!.append(chart);

  const initial: ChartConfig<BarDatum[]> = {
    data: [{ quarter: 'Q1', sales: 42 }, { quarter: 'Q2', sales: 55 }],
    indexBy: 'quarter',
    keys: ['sales'],
    autoSize: true,
    animate: false,
    ariaLabel: 'Quarterly sales',
    aria: { includeDataTable: false },
    themeMode,
    palette: getGlobalPalette()
  };

  const table = preview.querySelector('table')!;
  const applyConfig = (config: ChartConfig<BarDatum[]>) => {
    chart.config = config;
    const category = chart.indexBy;
    const keys = chart.keys;
    const header = document.createElement('tr');
    const body = document.createDocumentFragment();
    for (const field of [category, ...keys]) {
      const cell = document.createElement('th');
      cell.scope = 'col';
      cell.textContent = field;
      header.append(cell);
    }
    const data = chart.data;
    for (const datum of Array.isArray(data) ? data : []) {
      if (!datum || typeof datum !== 'object') continue;
      const row = document.createElement('tr');
      const name = document.createElement('th');
      name.scope = 'row';
      name.textContent = String(datum[category] ?? '');
      row.append(name);
      for (const key of keys) {
        const cell = document.createElement('td');
        cell.textContent = String(datum[key] ?? '');
        row.append(cell);
      }
      body.append(row);
    }
    table.tHead!.replaceChildren(header);
    table.tBodies[0].replaceChildren(body);
  };

  const editor = createLiveConfigEditor({
    title: 'Browser chart configuration',
    initialConfig: initial,
    onConfigChange: applyConfig
  });
  preview.querySelector('.ssr-config')!.append(editor.element);
  container.append(html, react, preview);
  applyConfig(initial);
  return [chart];
}
