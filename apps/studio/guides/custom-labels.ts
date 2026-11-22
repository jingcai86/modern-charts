import type {
  MCBaseChart,
  LabelDescriptor,
  MeasuredLabel,
  ThemeModePreference
} from '../../../src/index';
import { createCodeBlock } from './shared';

export function renderCustomLabelsGuide(
  container: HTMLElement,
  themeMode: ThemeModePreference
): MCBaseChart<any>[] {
  const mounted: MCBaseChart<any>[] = [];

  const introCard = document.createElement('section');
  introCard.className = 'panel-card guide-section';
  introCard.innerHTML = `
    <h2 class="panel-title">Universal Label Architecture (<code>&lt;mc-label&gt;</code> &amp; <code>@chenglou/pretext</code>)</h2>
    <p class="guide-prose">
      Every single text element in <code>modern-charts</code> — titles, axis ticks, bar/point values, donut arcs,
      marker callouts, and legends — flows through <code>LabelEngine</code> and is measured via
      <code>@chenglou/pretext</code> with <strong>zero DOM layout reflow</strong>. You can customize labels at three levels:
    </p>
    <div class="guide-pillars-grid">
      <div class="guide-pillar-card">
        <h3>1. SVG Mode (<code>'svg'</code>)</h3>
        <p>Renders crisp SVG <code>&lt;text&gt;</code>/<code>&lt;tspan&gt;</code> with automatic Pretext line wrapping, custom <code>formatter</code> functions, backgrounds, and padding.</p>
      </div>
      <div class="guide-pillar-card">
        <h3>2. Rich HTML Mode (<code>'foreignObject'</code>)</h3>
        <p>Renders Pretext-sized SVG <code>&lt;foreignObject&gt;</code> HTML pills with inline SVG icons (<code>icon</code>, <code>iconPosition</code>) and custom <code>templateHtml</code>.</p>
      </div>
      <div class="guide-pillar-card">
        <h3>3. Full Custom Renderer (<code>labelRenderer</code>)</h3>
        <p>Take complete programmatic control via <code>(descriptor, measured, defaultRender) =&gt; SVGElement | HTMLElement</code> with exact Pretext dimensions pre-computed for you.</p>
      </div>
    </div>
  `;
  container.appendChild(introCard);

  // Example 1: Interactive 3-Mode Label Switcher on <mc-bar-chart>
  const ex1 = document.createElement('section');
  ex1.className = 'panel-card guide-section';
  ex1.innerHTML = `
    <div class="panel-header">
      <div>
        <h2 class="panel-title">Example 1: Formatters, Rich <code>&lt;foreignObject&gt;</code> Icons &amp; Custom <code>labelRenderer</code></h2>
        <p class="guide-prose" style="margin:4px 0 0;">
          Switch between the 3 label customization approaches on the same live bar chart and compare the generated code.
        </p>
      </div>
      <div class="guide-controls-row">
        <button type="button" id="btn-lbl-svg" class="btn-primary">SVG Formatter</button>
        <button type="button" id="btn-lbl-fo">foreignObject + Icons</button>
        <button type="button" id="btn-lbl-custom">Custom labelRenderer</button>
      </div>
    </div>
    <div class="guide-example-grid">
      <div class="guide-chart-stage" id="guide-label-chart-1"></div>
      <div id="guide-label-code-1"></div>
    </div>
  `;
  container.appendChild(ex1);

  const labelChart1 = document.createElement('mc-bar-chart') as MCBaseChart<any>;
  ex1.querySelector('#guide-label-chart-1')!.appendChild(labelChart1);
  mounted.push(labelChart1);

  const labelCode1 = ex1.querySelector('#guide-label-code-1') as HTMLElement;

  const salesData = [
    { quarter: 'Q1', Revenue: 142 },
    { quarter: 'Q2', Revenue: 168 },
    { quarter: 'Q3', Revenue: 196 },
    { quarter: 'Q4', Revenue: 248 }
  ];

  const TREND_UP_SVG = `<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 11L12 4M12 4H6M12 4V10"/></svg>`;

  type DemoLabelMode = 'svg' | 'foreignObject' | 'custom';
  let activeLabelDemo: DemoLabelMode = 'svg';

  const renderLabelDemo1 = (mode: DemoLabelMode) => {
    activeLabelDemo = mode;

    const baseConfig: Record<string, any> = {
      data: salesData,
      autoSize: true,
      themeMode,
      palette: 'modern',
      indexBy: 'quarter',
      keys: ['Revenue'],
      enableLabels: true,
      borderRadius: 8,
      yScale: { type: 'linear', min: 0, max: 290 },
      margin: { top: 44, right: 24, bottom: 52, left: 54 },
      layers: ['grid', 'axes', 'bars', 'labels']
    };

    if (mode === 'svg') {
      labelChart1.setConfig({
        ...baseConfig,
        title: 'Mode 1: SVG Formatter + Pill Background',
        labelMode: 'svg',
        label: [
          {
            target: 'data',
            formatter: (text: string) => `$${text}K`,
            fontWeight: 700,
            fontSize: 12,
            color: '#ffffff',
            background: 'rgba(15, 23, 42, 0.55)',
            borderRadius: 5,
            padding: { top: 2, right: 6, bottom: 2, left: 6 }
          },
          {
            target: 'axis-tick',
            formatter: (text: string) => (/^\d+$/.test(text) ? `$${text}K` : text)
          }
        ]
      });

      labelCode1.innerHTML = '';
      labelCode1.appendChild(
        createCodeBlock(
          `
chart.config = {
  data: salesData,
  labelMode: 'svg',
  label: [
    {
      target: 'data',
      formatter: (text) => \`$\${text}K\`,
      fontWeight: 700,
      color: '#ffffff',
      background: 'rgba(15, 23, 42, 0.55)',
      borderRadius: 5,
      padding: { top: 2, right: 6, bottom: 2, left: 6 }
    },
    {
      target: 'axis-tick',
      formatter: (t) => (/^\\d+$/.test(t) ? \`$\${t}K\` : t)
    }
  ]
};
          `,
          'SVG Label Overrides & Formatters'
        )
      );
    } else if (mode === 'foreignObject') {
      labelChart1.setConfig({
        ...baseConfig,
        title: 'Mode 2: Pretext-Measured <foreignObject> with SVG Icons',
        labelMode: 'foreignObject',
        label: {
          target: 'data',
          renderMode: 'foreignObject',
          formatter: (text: string) => `$${text}K`,
          icon: TREND_UP_SVG,
          iconPosition: 'start',
          iconSize: 12,
          iconGap: 4,
          fontSize: 12,
          fontWeight: 700,
          color: '#ecfdf5',
          background: 'rgba(5, 150, 105, 0.85)',
          borderRadius: 999,
          padding: { top: 3, right: 8, bottom: 3, left: 7 }
        }
      });

      labelCode1.innerHTML = '';
      labelCode1.appendChild(
        createCodeBlock(
          `
const TREND_UP_SVG = \`<svg viewBox="0 0 16 16" width="12" height="12"
  fill="none" stroke="currentColor" stroke-width="2.2">
  <path d="M3 11L12 4M12 4H6M12 4V10"/>
</svg>\`;

chart.config = {
  data: salesData,
  labelMode: 'foreignObject',
  label: {
    target: 'data',
    renderMode: 'foreignObject',
    formatter: (text) => \`$\${text}K\`,
    icon: TREND_UP_SVG,
    iconPosition: 'start',
    iconSize: 12,
    iconGap: 4,
    color: '#ecfdf5',
    background: 'rgba(5, 150, 105, 0.85)',
    borderRadius: 999,
    padding: { top: 3, right: 8, bottom: 3, left: 7 }
  }
};
          `,
          'Rich <foreignObject> Labels with Inline SVG Icons'
        )
      );
    } else {
      const total = salesData.reduce((s, d) => s + d.Revenue, 0);
      labelChart1.setConfig({
        ...baseConfig,
        title: 'Mode 3: Custom labelRenderer (Pretext Measured)',
        labelMode: 'custom',
        labelRenderer: (
          descriptor: LabelDescriptor,
          measured: MeasuredLabel,
          defaultRender: () => SVGGElement
        ) => {
          if (descriptor.type !== 'data') return defaultRender();

          const val = Number(descriptor.text);
          const share = Math.round((val / total) * 100);
          const isTop = val >= 200;

          const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          const pillW = Math.max(measured.boxWidth + 32, 74);
          const pillH = 24;

          const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          rect.setAttribute('x', String(descriptor.x - pillW / 2));
          rect.setAttribute('y', String(descriptor.y - pillH / 2));
          rect.setAttribute('width', String(pillW));
          rect.setAttribute('height', String(pillH));
          rect.setAttribute('rx', '12');
          rect.setAttribute('fill', isTop ? '#f59e0b' : '#1e293b');
          rect.setAttribute('stroke', isTop ? '#fef3c7' : '#6366f1');
          rect.setAttribute('stroke-width', '1.4');
          g.appendChild(rect);

          const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          text.setAttribute('x', String(descriptor.x));
          text.setAttribute('y', String(descriptor.y + 4));
          text.setAttribute('text-anchor', 'middle');
          text.setAttribute('font-size', '11');
          text.setAttribute('font-weight', '700');
          text.setAttribute('fill', isTop ? '#0f172a' : '#f8fafc');
          text.textContent = `${isTop ? '★ ' : ''}$${val}K (${share}%)`;
          g.appendChild(text);

          return g;
        }
      });

      labelCode1.innerHTML = '';
      labelCode1.appendChild(
        createCodeBlock(
          `
chart.config = {
  data: salesData,
  labelMode: 'custom',
  labelRenderer: (descriptor, measured, defaultRender) => {
    // Fall back to default Pretext rendering for titles & axis ticks
    if (descriptor.type !== 'data') return defaultRender();

    const val = Number(descriptor.text);
    const share = Math.round((val / total) * 100);
    const isTop = val >= 200;

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const pillW = Math.max(measured.boxWidth + 32, 74);
    // Append custom SVG pill + text using descriptor.x / descriptor.y...
    return g;
  }
};
          `,
          'Custom Programmatic labelRenderer'
        )
      );
    }
  };

  const btnSvg = ex1.querySelector('#btn-lbl-svg') as HTMLButtonElement;
  const btnFo = ex1.querySelector('#btn-lbl-fo') as HTMLButtonElement;
  const btnCustom = ex1.querySelector('#btn-lbl-custom') as HTMLButtonElement;

  const syncLabelBtns = () => {
    btnSvg.classList.toggle('btn-primary', activeLabelDemo === 'svg');
    btnFo.classList.toggle('btn-primary', activeLabelDemo === 'foreignObject');
    btnCustom.classList.toggle('btn-primary', activeLabelDemo === 'custom');
  };

  btnSvg.addEventListener('click', () => {
    renderLabelDemo1('svg');
    syncLabelBtns();
  });
  btnFo.addEventListener('click', () => {
    renderLabelDemo1('foreignObject');
    syncLabelBtns();
  });
  btnCustom.addEventListener('click', () => {
    renderLabelDemo1('custom');
    syncLabelBtns();
  });

  renderLabelDemo1('svg');

  // Example 2: Multi-Line Pretext Wrapping with Live maxWidth Slider
  const ex2 = document.createElement('section');
  ex2.className = 'panel-card guide-section';
  ex2.innerHTML = `
    <div class="panel-header">
      <div>
        <h2 class="panel-title">Example 2: Zero-Reflow Multi-Line Wrapping via <code>maxWidth</code></h2>
        <p class="guide-prose" style="margin:4px 0 0;">
          Drag the <code>maxWidth</code> slider to watch <code>@chenglou/pretext</code> break long category labels cleanly into multiple lines without touching the DOM layout engine.
        </p>
      </div>
      <div class="guide-controls-row">
        <label for="lbl-maxwidth-slider" style="font-size:0.82rem;color:var(--text-muted);font-weight:600;">
          Axis Tick <code>maxWidth</code>: <strong id="lbl-maxwidth-val">82px</strong>
        </label>
        <input type="range" id="lbl-maxwidth-slider" min="48" max="170" step="2" value="82" />
      </div>
    </div>
    <div class="guide-example-grid">
      <div class="guide-chart-stage" id="guide-label-chart-2"></div>
      <div id="guide-label-code-2"></div>
    </div>
  `;
  container.appendChild(ex2);

  const wrapChart = document.createElement('mc-bar-chart') as MCBaseChart<any>;
  ex2.querySelector('#guide-label-chart-2')!.appendChild(wrapChart);
  mounted.push(wrapChart);

  let tickMaxWidth = 82;
  const renderWrapChart = () => {
    wrapChart.setConfig({
      data: [
        { dept: 'Cloud Platform Engineering', Spend: 214 },
        { dept: 'Applied Machine Learning', Spend: 186 },
        { dept: 'Security & Compliance Ops', Spend: 129 },
        { dept: 'Developer Experience Tools', Spend: 158 }
      ],
      autoSize: true,
      themeMode,
      palette: 'sunset',
      title: `Pretext Wrapping (axis-tick maxWidth: ${tickMaxWidth}px)`,
      indexBy: 'dept',
      keys: ['Spend'],
      borderRadius: 6,
      margin: { top: 44, right: 24, bottom: 88, left: 50 },
      label: {
        target: 'axis-tick',
        maxWidth: tickMaxWidth,
        fontSize: 11
      },
      layers: ['grid', 'axes', 'bars', 'labels']
    });
  };
  renderWrapChart();

  const maxWidthSlider = ex2.querySelector('#lbl-maxwidth-slider') as HTMLInputElement;
  const maxWidthVal = ex2.querySelector('#lbl-maxwidth-val') as HTMLElement;
  maxWidthSlider.addEventListener('input', () => {
    tickMaxWidth = Number(maxWidthSlider.value);
    maxWidthVal.textContent = `${tickMaxWidth}px`;
    renderWrapChart();
  });

  ex2.querySelector('#guide-label-code-2')!.appendChild(
    createCodeBlock(
      `
// Works both via chart.config.label AND declaratively via <mc-label>:
chart.config = {
  data: departmentData,
  label: {
    target: 'axis-tick', // 'all' | 'data' | 'axis-tick' | 'arc' | 'title' | 'marker' | ...
    maxWidth: 82,
    fontSize: 11
  }
};

// Declarative Web Component equivalent:
// <mc-bar-chart>
//   <mc-label target="axis-tick" max-width="82" font-size="11"></mc-label>
// </mc-bar-chart>
      `,
      'Multi-Line Wrapping with maxWidth'
    )
  );

  return mounted;
}

