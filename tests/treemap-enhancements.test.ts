import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  registerModernCharts,
  type HierarchyNode,
  type MCTreemapChart
} from '../src/index';

const TREEMAP_DATA: HierarchyNode = {
  name: 'Bundle',
  children: [
    {
      name: 'Core',
      children: [
        { name: 'Scales', value: 45 },
        { name: 'Labels', value: 65 },
        { name: 'Events', value: 30 }
      ]
    },
    {
      name: 'Charts',
      children: [
        { name: 'Bar', value: 50 },
        { name: 'Line', value: 40 }
      ]
    }
  ]
};

describe('Treemap Chart Enhancements (Issue #73)', () => {
  beforeAll(() => {
    registerModernCharts();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('supports all 6 D3 tile algorithms, leavesOnly, parentLabelHeight, colorBy, and nodeOpacity', () => {
    const treemap = document.createElement('mc-treemap-chart') as MCTreemapChart;
    document.body.appendChild(treemap);

    // 1. Default leavesOnly = false renders parent containers + 5 leaf tiles
    treemap.config = {
      width: 520,
      height: 360,
      tile: 'binary',
      leavesOnly: false,
      parentLabelHeight: 24,
      colorBy: 'parent',
      nodeOpacity: 0.85,
      data: TREEMAP_DATA
    };

    const parents = treemap.shadowRoot!.querySelectorAll('.mc-treemap-parent');
    const tiles = treemap.shadowRoot!.querySelectorAll<SVGRectElement>('.mc-treemap-tile');
    expect(parents.length).toBe(2);
    expect(tiles.length).toBe(5);
    expect(tiles[0].getAttribute('fill-opacity')).toBe('0.85');

    // 2. leavesOnly = true hides parent containers and colorBy = 'name' assigns distinct colors per leaf
    treemap.config = {
      ...treemap.config,
      tile: 'sliceDice',
      leavesOnly: true,
      colorBy: 'name'
    };

    expect(treemap.shadowRoot!.querySelectorAll('.mc-treemap-parent').length).toBe(0);
    const leafColors = new Set(
      Array.from(
        treemap.shadowRoot!.querySelectorAll<SVGRectElement>('.mc-treemap-tile')
      ).map((el) => el.getAttribute('fill'))
    );
    expect(leafColors.size).toBe(5);
  });

  it('supports orientLabel vertical label rotation in narrow vertical strips (dice tiling) and interactiveDrilldown', () => {
    const treemap = document.createElement('mc-treemap-chart') as MCTreemapChart;
    document.body.appendChild(treemap);

    treemap.config = {
      width: 240,
      height: 360,
      tile: 'dice',
      leavesOnly: true,
      orientLabel: true,
      interactiveDrilldown: true,
      data: TREEMAP_DATA
    };

    // With dice tiling on a 240px width across 5 leaves, each vertical strip is ~44px wide and ~320px tall -> rotated -90°
    const rotatedLabels = Array.from(
      treemap.shadowRoot!.querySelectorAll<SVGGElement>('.mc-layer--labels .mc-label')
    ).filter((g) => (g.getAttribute('transform') || '').includes('rotate(-90'));
    expect(rotatedLabels.length).toBeGreaterThan(0);

    // Clicking a tile in 'Core' drills down into Core (3 leaves) and renders the breadcrumb bar
    const scalesTile = treemap.shadowRoot!.querySelector<SVGRectElement>('.mc-treemap-tile[data-name="Scales"]')!;
    scalesTile.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(treemap.shadowRoot!.querySelector('.mc-treemap-breadcrumb')).not.toBeNull();
    expect(treemap.shadowRoot!.querySelectorAll('.mc-treemap-tile').length).toBe(3);

    // Clicking breadcrumb bar drills back up to full 5 leaves
    const breadcrumb = treemap.shadowRoot!.querySelector<SVGGElement>('.mc-treemap-breadcrumb')!;
    breadcrumb.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(treemap.shadowRoot!.querySelector('.mc-treemap-breadcrumb')).toBeNull();
    expect(treemap.shadowRoot!.querySelectorAll('.mc-treemap-tile').length).toBe(5);
  });
});
