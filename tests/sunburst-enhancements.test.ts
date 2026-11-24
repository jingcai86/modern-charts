import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  registerModernCharts,
  type HierarchyNode,
  type MCSunburstChart
} from '../src/index';

const HIERARCHY_DATA: HierarchyNode = {
  name: 'Platform',
  children: [
    {
      name: 'Core',
      children: [
        { name: 'Scales', value: 30 },
        { name: 'Labels', value: 70 }
      ]
    },
    {
      name: 'Charts',
      children: [
        { name: 'Bar', value: 40 },
        { name: 'Line', value: 20 }
      ]
    }
  ]
};

describe('Sunburst Chart Enhancements (Issue #73)', () => {
  beforeAll(() => {
    registerModernCharts();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('supports innerRadius, padAngle, startAngle/endAngle, sort, and inheritColorFromParent', () => {
    const sunburst = document.createElement('mc-sunburst-chart') as MCSunburstChart;
    document.body.appendChild(sunburst);

    // 1. sort: 'desc' (default) vs 'asc'
    sunburst.config = {
      width: 480,
      height: 380,
      innerRadius: 0.35,
      padAngle: 1.5,
      startAngle: -90,
      endAngle: 90,
      sort: 'desc',
      inheritColorFromParent: true,
      data: HIERARCHY_DATA
    };

    const centerCircle = sunburst.shadowRoot!.querySelector<SVGCircleElement>('.mc-sunburst-center')!;
    expect(Number(centerCircle.getAttribute('r'))).toBeGreaterThan(35);

    const descDepth1 = Array.from(
      sunburst.shadowRoot!.querySelectorAll<SVGPathElement>('.mc-sunburst-arc[data-depth="1"]')
    ).map((el) => el.getAttribute('data-name'));
    // Core (100) > Charts (60)
    expect(descDepth1).toEqual(['Core', 'Charts']);

    // 2. sort: 'asc' + inheritColorFromParent: false
    sunburst.config = {
      ...sunburst.config,
      sort: 'asc',
      inheritColorFromParent: false
    };

    const ascDepth1 = Array.from(
      sunburst.shadowRoot!.querySelectorAll<SVGPathElement>('.mc-sunburst-arc[data-depth="1"]')
    ).map((el) => el.getAttribute('data-name'));
    expect(ascDepth1).toEqual(['Charts', 'Core']);

    const coreArc = sunburst.shadowRoot!.querySelector<SVGPathElement>('.mc-sunburst-arc[data-name="Core"]')!;
    const labelsArc = sunburst.shadowRoot!.querySelector<SVGPathElement>('.mc-sunburst-arc[data-name="Labels"]')!;
    expect(coreArc.getAttribute('fill')).not.toBe(labelsArc.getAttribute('fill'));
  });

  it('supports ancestor and descendant focusMode highlighting and radial/tangential label orientations', () => {
    const sunburst = document.createElement('mc-sunburst-chart') as MCSunburstChart;
    document.body.appendChild(sunburst);

    const getFocusState = (name: string) =>
      sunburst.shadowRoot!
        .querySelector(`.mc-sunburst-arc[data-name="${name}"]`)!
        .getAttribute('data-focus-state');

    // 1. focusMode: 'ancestor' + labelOrientation: 'radial'
    sunburst.config = {
      width: 480,
      height: 380,
      focusMode: 'ancestor',
      labelOrientation: 'radial',
      minArcAngleForLabel: 5,
      data: HIERARCHY_DATA
    };

    // Hovering child 'Labels' highlights 'Labels' and its parent 'Core', while dimming 'Scales' and 'Charts'
    const labelsArc = sunburst.shadowRoot!.querySelector<SVGPathElement>('.mc-sunburst-arc[data-name="Labels"]')!;
    labelsArc.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    expect(getFocusState('Labels')).toBe('active');
    expect(getFocusState('Core')).toBe('active');
    expect(getFocusState('Scales')).toBe('dimmed');
    expect(getFocusState('Charts')).toBe('dimmed');
    labelsArc.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    expect(getFocusState('Charts')).toBeNull();

    // 2. focusMode: 'descendant' + labelOrientation: 'tangential'
    sunburst.config = {
      ...sunburst.config,
      focusMode: 'descendant',
      labelOrientation: 'tangential'
    };

    // Hovering parent 'Core' highlights 'Core', 'Scales', and 'Labels', while dimming 'Charts' & 'Bar'
    const coreArc = sunburst.shadowRoot!.querySelector<SVGPathElement>('.mc-sunburst-arc[data-name="Core"]')!;
    coreArc.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    expect(getFocusState('Core')).toBe('active');
    expect(getFocusState('Scales')).toBe('active');
    expect(getFocusState('Labels')).toBe('active');
    expect(getFocusState('Charts')).toBe('dimmed');
    expect(getFocusState('Bar')).toBe('dimmed');
  });
});
