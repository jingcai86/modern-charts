import { describe, it, expect, beforeEach } from 'vitest';
import {
  CORE_COMPONENT_REGISTRY,
  MCDefElement,
  linearGradientDef,
  patternCrosshatch,
  patternDots,
  patternLines,
  patternSquares,
  radialGradientDef,
  registerModernCharts,
  type MCBarChart,
  type MCGaugeChart,
  type MCLineChart,
  type MCPieChart,
  type MCSankeyChart
} from '../src/index';
import {
  SAMPLE_BAR_DATA,
  SAMPLE_GAUGE_DATA,
  SAMPLE_HEATMAP_DATA,
  SAMPLE_LINE_DATA,
  SAMPLE_PIE_DATA,
  SAMPLE_RADAR_DATA,
  SAMPLE_SANKEY_DATA,
  SAMPLE_SCATTER_DATA,
  SAMPLE_SUNBURST_DATA
} from '../apps/studio/sample-data';

registerModernCharts();

function extractUrlId(val: string | null): string | null {
  if (!val) return null;
  const m = /^url\(#([^)]+)\)$/.exec(val.trim());
  return m ? m[1] : null;
}

describe('SVG Patterns & Gradients Engine (<defs> + fill rules — Issue #15)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('scopes <defs> pattern and gradient IDs uniquely per chart instance to prevent multi-chart url(#id) collisions', () => {
    const barA = document.createElement('mc-bar-chart') as MCBarChart;
    const barB = document.createElement('mc-bar-chart') as MCBarChart;
    document.body.append(barA, barB);

    const sharedConfig = {
      data: SAMPLE_BAR_DATA,
      indexBy: 'quarter',
      keys: ['Cloud', 'Edge'],
      width: 480,
      height: 300,
      defs: [
        patternLines('stripes', { background: '#6366f1', color: '#ffffff', rotation: -45 }),
        linearGradientDef('grad', ['#06b6d4', '#3b82f6'])
      ],
      fill: [
        { match: 'Cloud', id: 'stripes' },
        { match: 'Edge', id: 'grad' }
      ]
    };

    barA.config = sharedConfig;
    barB.config = sharedConfig;

    const fillA = barA.shadowRoot
      ?.querySelector('.mc-bar-rect[data-key="Cloud"]')
      ?.getAttribute('fill');
    const fillB = barB.shadowRoot
      ?.querySelector('.mc-bar-rect[data-key="Cloud"]')
      ?.getAttribute('fill');

    const idA = extractUrlId(fillA ?? null);
    const idB = extractUrlId(fillB ?? null);
    expect(idA).toBeTruthy();
    expect(idB).toBeTruthy();
    expect(idA).not.toBe(idB);

    // Each chart's own <defs> contains its own scoped <pattern>
    expect(barA.shadowRoot?.querySelector(`.mc-chart-defs #${idA}`)?.tagName.toLowerCase()).toBe('pattern');
    expect(barB.shadowRoot?.querySelector(`.mc-chart-defs #${idB}`)?.tagName.toLowerCase()).toBe('pattern');
    expect(barA.shadowRoot?.querySelector(`.mc-chart-defs #${idB}`)).toBeNull();
  });

  it('renders all 6 built-in pattern/gradient helpers plus custom svg & render() defs with inherit color substitution', () => {
    const pie = document.createElement('mc-pie-chart') as MCPieChart;
    document.body.appendChild(pie);

    pie.config = {
      data: [
        { id: 'Dots', value: 20 },
        { id: 'Lines', value: 20 },
        { id: 'Squares', value: 20 },
        { id: 'Hatch', value: 20 },
        { id: 'Linear', value: 20 },
        { id: 'Radial', value: 20 },
        { id: 'CustomSvg', value: 20 },
        { id: 'CustomFn', value: 20 }
      ],
      width: 520,
      height: 360,
      defs: [
        patternDots('p-dots', { background: 'inherit', size: 4, padding: 4, stagger: true }),
        patternLines('p-lines', { background: 'inherit', rotation: 90, spacing: 6 }),
        patternSquares('p-squares', { background: 'inherit', size: 4, padding: 3, stagger: true }),
        patternCrosshatch('p-hatch', { background: 'inherit', rotation: 45, spacing: 7 }),
        linearGradientDef('g-lin', [
          { offset: 0, color: 'inherit', opacity: 1 },
          { offset: 100, color: 'inherit', opacity: 0.3 }
        ], { angle: 45 }),
        radialGradientDef('g-rad', ['#818cf8', '#312e81']),
        {
          id: 'p-custom-svg',
          type: 'custom',
          width: 10,
          height: 10,
          svg: '<rect width="10" height="10" fill="inherit"/><circle cx="5" cy="5" r="2" fill="white"/>'
        },
        {
          id: 'p-custom-fn',
          type: 'custom',
          render: (scopedId, baseColor) => {
            const pat = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
            pat.setAttribute('id', scopedId);
            pat.setAttribute('width', '8');
            pat.setAttribute('height', '8');
            pat.setAttribute('patternUnits', 'userSpaceOnUse');
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('width', '8');
            rect.setAttribute('height', '8');
            rect.setAttribute('fill', baseColor);
            pat.appendChild(rect);
            return pat;
          }
        }
      ],
      fill: [
        { match: 'Dots', id: 'p-dots' },
        { match: 'Lines', id: 'p-lines' },
        { match: 'Squares', id: 'p-squares' },
        { match: 'Hatch', id: 'p-hatch' },
        { match: 'Linear', id: 'g-lin' },
        { match: 'Radial', id: 'g-rad' },
        { match: 'CustomSvg', id: 'p-custom-svg' },
        { match: 'CustomFn', id: 'p-custom-fn' }
      ]
    };

    const arcs = Array.from(pie.shadowRoot?.querySelectorAll('.mc-pie-arc') ?? []);
    expect(arcs.length).toBe(8);

    const expectedTags: Record<string, string> = {
      Dots: 'pattern',
      Lines: 'pattern',
      Squares: 'pattern',
      Hatch: 'pattern',
      Linear: 'lineargradient',
      Radial: 'radialgradient',
      CustomSvg: 'pattern',
      CustomFn: 'pattern'
    };

    for (const arc of arcs) {
      const sliceId = arc.getAttribute('data-id')!;
      const defId = extractUrlId(arc.getAttribute('fill'));
      expect(defId, `${sliceId} should have url(#...) fill`).toBeTruthy();
      const defNode = pie.shadowRoot?.querySelector(`.mc-chart-defs #${defId}`);
      expect(defNode).not.toBeNull();
      expect(defNode?.tagName.toLowerCase()).toBe(expectedTags[sliceId]);
    }

    // Verify crosshatch has 2 <line> elements and dots stagger has 2 <circle> elements
    const hatchId = extractUrlId(
      pie.shadowRoot?.querySelector('.mc-pie-arc[data-id="Hatch"]')?.getAttribute('fill') ?? null
    )!;
    expect(
      pie.shadowRoot?.querySelectorAll(`.mc-chart-defs #${hatchId} line`).length
    ).toBe(2);

    const dotsId = extractUrlId(
      pie.shadowRoot?.querySelector('.mc-pie-arc[data-id="Dots"]')?.getAttribute('fill') ?? null
    )!;
    expect(
      pie.shadowRoot?.querySelectorAll(`.mc-chart-defs #${dotsId} circle`).length
    ).toBe(2);

    // Legend swatches mirror the series patterns too!
    const legendSwatch = pie.shadowRoot?.querySelector('.mc-legend-swatch');
    expect(legendSwatch?.getAttribute('fill')).toMatch(/^url\(#mc-def-/);
  });

  it('supports wildcard (*), string, object, and datum predicate fill matchers across all 10 charts', () => {
    const tenCharts: Array<{
      tag: string;
      config: Record<string, any>;
      itemSelector: string;
      attr?: 'fill' | 'stroke';
    }> = [
      {
        tag: 'mc-bar-chart',
        config: {
          data: SAMPLE_BAR_DATA,
          indexBy: 'quarter',
          keys: ['Cloud', 'Edge'],
          width: 480,
          height: 300
        },
        itemSelector: '.mc-bar-rect'
      },
      {
        tag: 'mc-line-chart',
        config: {
          data: SAMPLE_LINE_DATA,
          enableArea: true,
          width: 480,
          height: 300
        },
        itemSelector: '.mc-line-area'
      },
      {
        tag: 'mc-pie-chart',
        config: { data: SAMPLE_PIE_DATA, width: 480, height: 300 },
        itemSelector: '.mc-pie-arc'
      },
      {
        tag: 'mc-sunburst-chart',
        config: { data: SAMPLE_SUNBURST_DATA, width: 480, height: 300 },
        itemSelector: '.mc-sunburst-arc'
      },
      {
        tag: 'mc-treemap-chart',
        config: { data: SAMPLE_SUNBURST_DATA, width: 480, height: 300 },
        itemSelector: '.mc-treemap-tile'
      },
      {
        tag: 'mc-radar-chart',
        config: {
          data: SAMPLE_RADAR_DATA,
          indexBy: 'metric',
          keys: ['ModernCharts', 'TraditionalChart'],
          width: 480,
          height: 300
        },
        itemSelector: '.mc-radar-polygon'
      },
      {
        tag: 'mc-heatmap-chart',
        config: { data: SAMPLE_HEATMAP_DATA, width: 480, height: 300 },
        itemSelector: '.mc-heatmap-cell'
      },
      {
        tag: 'mc-scatter-chart',
        config: { data: SAMPLE_SCATTER_DATA, width: 480, height: 300 },
        itemSelector: '.mc-scatter-node'
      },
      {
        tag: 'mc-sankey-chart',
        config: { data: SAMPLE_SANKEY_DATA, width: 480, height: 300 },
        itemSelector: '.mc-sankey-node'
      },
      {
        tag: 'mc-gauge-chart',
        config: { data: SAMPLE_GAUGE_DATA, width: 480, height: 300 },
        itemSelector: '.mc-gauge-value-arc'
      }
    ];

    for (const c of tenCharts) {
      const el = document.createElement(c.tag) as any;
      document.body.appendChild(el);
      el.config = {
        ...c.config,
        defs: [
          patternLines('universal-stripes', { background: 'inherit', rotation: -45 })
        ],
        fill: [{ match: '*', id: 'universal-stripes' }]
      };

      const items = Array.from(el.shadowRoot?.querySelectorAll(c.itemSelector) ?? []);
      expect(items.length, `${c.tag} should render items`).toBeGreaterThan(0);

      const firstVal = (items[0] as Element).getAttribute(c.attr ?? 'fill');
      const defId = extractUrlId(firstVal);
      expect(defId, `${c.tag} item should reference scoped pattern`).toBeTruthy();
      expect(
        el.shadowRoot?.querySelector(`.mc-chart-defs #${defId}`),
        `${c.tag} <defs> should contain #${defId}`
      ).not.toBeNull();
    }

    // Also verify Sankey link stroke pattern/gradient matching via target: 'link'
    const sankey = document.createElement('mc-sankey-chart') as MCSankeyChart;
    document.body.appendChild(sankey);
    sankey.config = {
      data: SAMPLE_SANKEY_DATA,
      width: 480,
      height: 300,
      defs: [linearGradientDef('link-grad', ['#38bdf8', '#a855f7'])],
      fill: [{ match: { target: 'link' }, id: 'link-grad' }]
    };
    const firstLink = sankey.shadowRoot?.querySelector('.mc-sankey-link');
    const linkGradId = extractUrlId(firstLink?.getAttribute('stroke') ?? null);
    expect(linkGradId).toMatch(/^mc-def-\d+-link-grad$/);

    // Verify datum predicate matching on bar chart
    const barPred = document.createElement('mc-bar-chart') as MCBarChart;
    document.body.appendChild(barPred);
    barPred.config = {
      data: [
        { quarter: 'Q1', Cloud: 120 },
        { quarter: 'Q2', Cloud: 250 }
      ],
      indexBy: 'quarter',
      keys: ['Cloud'],
      width: 480,
      height: 300,
      defs: [linearGradientDef('gold', ['#fbbf24', '#f97316'])],
      fill: [{ match: (datum) => Number(datum.value) >= 200, id: 'gold' }]
    };
    const q1Rect = barPred.shadowRoot?.querySelector('.mc-bar-rect[data-index="Q1"]');
    const q2Rect = barPred.shadowRoot?.querySelector('.mc-bar-rect[data-index="Q2"]');
    expect(q1Rect?.getAttribute('fill')).not.toMatch(/^url\(/);
    expect(q2Rect?.getAttribute('fill')).toMatch(/^url\(#mc-def-\d+-gold\)$/);
  });

  it('integrates seamlessly with hover states, animations, and marker threshold partial restyling', () => {
    const bar = document.createElement('mc-bar-chart') as MCBarChart;
    document.body.appendChild(bar);

    bar.config = {
      data: [
        { quarter: 'Q1', Cloud: 100 },
        { quarter: 'Q2', Cloud: 220 }
      ],
      indexBy: 'quarter',
      keys: ['Cloud'],
      animate: true,
      width: 480,
      height: 300,
      defs: [
        linearGradientDef('base-grad', ['#6366f1', '#38bdf8']),
        patternLines('alert-stripes', { background: '#ef4444', rotation: -45 })
      ],
      fill: [{ match: '*', id: 'base-grad' }],
      markers: [
        {
          id: 'cap',
          axis: 'y',
          value: 150,
          condition: 'above',
          matchStyle: { fill: 'alert-stripes', stroke: '#dc2626' }
        }
      ]
    };

    // Q1 stays below threshold -> uses base-grad
    const q1Bar = bar.shadowRoot?.querySelector('.mc-bar-rect[data-index="Q1"]') as SVGElement;
    expect(q1Bar.getAttribute('fill')).toMatch(/^url\(#mc-def-\d+-base-grad\)$/);

    // Hover preserves url(#...) fill and applies brightness filter
    q1Bar.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, clientX: 100, clientY: 100 }));
    expect(q1Bar.style.filter).toContain('brightness');
    expect(q1Bar.getAttribute('fill')).toMatch(/^url\(#mc-def-\d+-base-grad\)$/);
    q1Bar.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    expect(q1Bar.style.filter).toBe('none');

    // Q2 crosses threshold -> partial split with base-grad below 150 and alert-stripes above 150!
    const q2Group = bar.shadowRoot?.querySelector(
      '.mc-bar-rect--partial-threshold[data-index="Q2"]'
    );
    expect(q2Group).not.toBeNull();
    const baseSeg = q2Group?.querySelector('.mc-bar-segment--base');
    const threshSeg = q2Group?.querySelector('.mc-bar-segment--threshold');
    expect(baseSeg?.getAttribute('fill')).toMatch(/^url\(#mc-def-\d+-base-grad\)$/);
    expect(threshSeg?.getAttribute('fill')).toMatch(/^url\(#mc-def-\d+-alert-stripes\)$/);

    // Also verify partial threshold area split on <mc-line-chart> with pattern def
    const line = document.createElement('mc-line-chart') as MCLineChart;
    document.body.appendChild(line);
    line.config = {
      data: [
        {
          id: 'CPU',
          data: [
            { x: 't1', y: 40 },
            { x: 't2', y: 90 }
          ]
        }
      ],
      enableArea: true,
      width: 480,
      height: 300,
      defs: [patternLines('danger-hatch', { background: '#ef4444', rotation: -45 })],
      markers: [
        {
          id: 'high-cpu',
          axis: 'y',
          value: 70,
          condition: 'above',
          matchStyle: { fill: 'danger-hatch' }
        }
      ]
    };
    const areaThresh = line.shadowRoot?.querySelector('.mc-line-area-segment--threshold');
    expect(areaThresh?.getAttribute('fill')).toMatch(/^url\(#mc-def-\d+-danger-hatch\)$/);
  });

  it('supports declarative <mc-def> Web Component registered in CORE_COMPONENT_REGISTRY', () => {
    expect(CORE_COMPONENT_REGISTRY['mc-def']).toBe(MCDefElement);
    expect(customElements.get('mc-def')).toBe(MCDefElement);

    const gauge = document.createElement('mc-gauge-chart') as MCGaugeChart;
    const defEl = document.createElement('mc-def');
    defEl.setAttribute('def-id', 'decl-grad');
    defEl.setAttribute('type', 'linearGradient');
    defEl.setAttribute('match', '*');
    defEl.setAttribute('colors', '#38bdf8,#6366f1');
    defEl.setAttribute('angle', '90');
    gauge.appendChild(defEl);
    document.body.appendChild(gauge);

    gauge.config = { data: { value: 72, min: 0, max: 100 }, width: 400, height: 280 };

    const arc = gauge.shadowRoot?.querySelector('.mc-gauge-value-arc');
    const gradId = extractUrlId(arc?.getAttribute('fill') ?? null);
    expect(gradId).toMatch(/^mc-def-\d+-decl-grad$/);
    const stops = gauge.shadowRoot?.querySelectorAll(`.mc-chart-defs #${gradId} stop`) ?? [];
    expect(stops.length).toBe(2);
    expect(stops[0].getAttribute('stop-color')).toBe('#38bdf8');
    expect(stops[1].getAttribute('stop-color')).toBe('#6366f1');
  });
});
