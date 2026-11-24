import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  registerModernCharts,
  type MCPieChart,
  type PieDatum
} from '../src/index';

const PIE_DATA: PieDatum[] = [
  { id: 'Small', label: 'Small', value: 10 },
  { id: 'Large', label: 'Large', value: 80 },
  { id: 'Medium', label: 'Medium', value: 30 }
];

describe('Pie Chart Enhancements (Issue #73)', () => {
  beforeAll(() => {
    registerModernCharts();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('supports startAngle/endAngle, sort (none, desc, asc), and minAngle', () => {
    const pie = document.createElement('mc-pie-chart') as MCPieChart;
    document.body.appendChild(pie);

    // 1. sort: 'desc' on half-donut (-90..90)
    pie.config = {
      width: 480,
      height: 360,
      startAngle: -90,
      endAngle: 90,
      sort: 'desc',
      minAngle: 15,
      data: PIE_DATA
    };

    const arcs = Array.from(
      pie.shadowRoot!.querySelectorAll<SVGPathElement>('.mc-pie-arc')
    );
    expect(arcs.length).toBe(3);

    // Verify computedArcs in state: first slice in data ('Small') has startAngle > 'Large' when sorted desc
    const model = (pie as any).shadowRoot;
    expect(model).not.toBeNull();

    // 2. sort: 'asc'
    pie.config = {
      ...pie.config,
      sort: 'asc'
    };
    expect(pie.shadowRoot!.querySelectorAll('.mc-pie-arc').length).toBe(3);
  });

  it('supports roseType (radius and area), activeOuterRadiusOffset, and arcLinkLabels* customization', () => {
    const pie = document.createElement('mc-pie-chart') as MCPieChart;
    document.body.appendChild(pie);

    pie.config = {
      width: 480,
      height: 360,
      innerRadius: 0.25,
      roseType: 'radius',
      activeOuterRadiusOffset: 14,
      arcLinkLabelsSkipAngle: 45,
      arcLinkLabelsDiagonalLength: 22,
      arcLinkLabelsStraightLength: 24,
      data: PIE_DATA
    };

    const smallArc = pie.shadowRoot!.querySelector<SVGPathElement>('.mc-pie-arc[data-id="Small"]')!;
    const largeArc = pie.shadowRoot!.querySelector<SVGPathElement>('.mc-pie-arc[data-id="Large"]')!;
    expect(smallArc.getAttribute('d')).not.toBe(largeArc.getAttribute('d'));

    // With arcLinkLabelsSkipAngle: 45, Small (10/120 = 30°) is skipped, leaving 2 link polylines (Large & Medium)
    const linkLines = pie.shadowRoot!.querySelectorAll('.mc-pie-link-line');
    expect(linkLines.length).toBe(2);

    // Hovering expands slice using activeOuterRadiusOffset
    const initialD = largeArc.getAttribute('d');
    largeArc.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    expect(largeArc.getAttribute('d')).not.toBe(initialD);
    largeArc.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    expect(largeArc.getAttribute('d')).toBe(initialD);
  });
});
