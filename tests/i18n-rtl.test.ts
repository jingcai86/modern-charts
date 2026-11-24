import { afterEach, describe, expect, it, vi } from 'vitest';
import { createChartI18n } from '../src/core/i18n';
import { LabelEngine } from '../src/core/label-engine';
import {
  computeLegendLayout,
  createDefaultLegendConfig,
  renderUnifiedLegendLayer
} from '../src/core/legend-engine';
import { MarkerEngine } from '../src/core/marker-engine';
import { createDefaultTheme } from '../src/core/theme';
import { MCLabelElement } from '../src/components/mc-label';
import type { ChartRenderContext, LabelDescriptor, LegendItem } from '../src/core/types';

const SVG_NS = 'http://www.w3.org/2000/svg';
const theme = createDefaultTheme('light');
const padding = { top: 3, right: 8, bottom: 3, left: 5 };

function makeSvg(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  document.body.appendChild(svg);
  return svg;
}

function makeContext(direction: 'ltr' | 'rtl'): ChartRenderContext<any> {
  const svg = makeSvg();
  const engine = new LabelEngine();
  engine.setDirection(direction);
  return {
    chartType: 'bar',
    config: {},
    i18n: createChartI18n({ locale: direction === 'rtl' ? 'ar-EG' : 'en-US', direction }),
    theme,
    margin: { top: 60, right: 160, bottom: 80, left: 160 },
    innerWidth: 400,
    innerHeight: 240,
    legendConfig: createDefaultLegendConfig({ position: 'bottom', wrap: false }),
    markers: [],
    isInteractive: true,
    ariaConfig: { isFocusable: true },
    svg,
    rootGroup: svg,
    layerGroup: svg,
    renderLabel: (parent: SVGElement, descriptor: LabelDescriptor) =>
      engine.renderLabel(parent, descriptor, theme),
    measureText: (text: string, options?: Partial<LabelDescriptor>) =>
      engine.measure(text, options, theme),
    registerEventTarget: vi.fn((element: Element) => element),
    showLegendTooltip: vi.fn(),
    hideLegendTooltip: vi.fn(),
    showTooltip: vi.fn(),
    hideTooltip: vi.fn()
  } as unknown as ChartRenderContext<any>;
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('direction-aware label geometry', () => {
  it.each(['ltr', 'rtl'] as const)('aligns SVG text backgrounds for all logical anchors in %s', (direction) => {
    const engine = new LabelEngine();
    engine.setDirection(direction);
    for (const anchor of ['start', 'middle', 'end'] as const) {
      const descriptor: LabelDescriptor = {
        text: 'مرحبا 123', x: 120, y: 40, type: 'custom', anchor,
        background: '#eee', padding
      };
      const measured = engine.measure(descriptor.text, descriptor, theme);
      const group = engine.renderLabel(makeSvg(), descriptor, theme)!;
      const text = group.querySelector('text')!;
      const bg = group.querySelector('.mc-label-bg')!;
      const rightAligned = (anchor === 'start') === (direction === 'rtl');
      const expectedLeft = anchor === 'middle' ? -measured.boxWidth / 2
        : rightAligned ? -measured.width - padding.left : -padding.left;
      expect(group.getAttribute('direction')).toBe(direction);
      expect(text.getAttribute('direction')).toBe(direction);
      expect(text.getAttribute('text-anchor')).toBe(anchor);
      expect(Number(bg.getAttribute('x'))).toBeCloseTo(expectedLeft);
      expect(Number(bg.getAttribute('width'))).toBeCloseTo(measured.boxWidth);
      expect(group.getAttribute('transform')).toBe('translate(120, 40)');
    }
  });

  it('keeps wrapped RTL lines at one logical anchor and places truncation hit boxes under the text', () => {
    const engine = new LabelEngine();
    engine.setDirection('rtl');
    const wrapped = engine.renderLabel(makeSvg(), {
      text: 'مرحبا بكم في الرسم البياني الجميل', x: 0, y: 0, type: 'custom',
      anchor: 'start', maxWidth: 90, maxLines: 6, overflow: 'wrap'
    }, theme)!;
    const lines = wrapped.querySelectorAll('tspan');
    expect(lines.length).toBeGreaterThan(1);
    expect(Array.from(lines).every((line) => line.getAttribute('x') === '0')).toBe(true);
    expect(wrapped.querySelector('text')?.getAttribute('direction')).toBe('rtl');

    engine.setTooltipHandlers({ showTooltip: vi.fn(), hideTooltip: vi.fn() });
    const truncated = engine.renderLabel(makeSvg(), {
      text: 'مرحبا بالعالم الطويل', x: 0, y: 0, type: 'custom',
      anchor: 'start', maxChars: 5
    }, theme)!;
    const hit = truncated.querySelector('.mc-label-hit')!;
    expect(truncated.getAttribute('data-truncated')).toBe('true');
    expect(Number(hit.getAttribute('x'))).toBeLessThan(0);
    expect(Number(hit.getAttribute('x')) + Number(hit.getAttribute('width'))).toBeCloseTo(2);
  });

  it.each(['ltr', 'rtl'] as const)('aligns foreignObject text and icons to logical anchors in %s', (direction) => {
    const engine = new LabelEngine();
    engine.setDirection(direction);
    for (const anchor of ['start', 'middle', 'end'] as const) {
      const group = engine.renderLabel(makeSvg(), {
        text: 'مرحبا 42', x: 0, y: 0, type: 'custom', renderMode: 'foreignObject',
        anchor, icon: '<svg viewBox="0 0 10 10"></svg>', background: '#eee'
      }, theme)!;
      const fo = group.querySelector('foreignObject')!;
      const content = fo.querySelector('.mc-fo-label') as HTMLElement;
      const width = Number(fo.getAttribute('width'));
      const left = Number(fo.getAttribute('x'));
      const rightAligned = (anchor === 'start') === (direction === 'rtl');
      expect(left).toBeCloseTo(anchor === 'middle' ? Math.round(-width / 2) : rightAligned ? -width : 0, 0);
      expect(content.getAttribute('dir')).toBe(direction);
      expect(content.style.direction).toBe(direction);
      expect(content.style.textAlign).toBe(anchor === 'middle' ? 'center' : anchor);
      expect(content.firstElementChild?.classList.contains('mc-fo-label-icon')).toBe(true);
      expect(content.querySelector('.mc-fo-label-text')?.textContent).toBe('مرحبا 42');
      expect(Number.isFinite(width) && width > 0).toBe(true);
    }
  });

  it('positions caller-provided foreignObjects from their explicit width in RTL', () => {
    const engine = new LabelEngine();
    engine.setDirection('rtl');
    const group = engine.renderLabel(makeSvg(), {
      text: 'مخصص', x: 0, y: 0, type: 'custom', anchor: 'start',
      templateHtml: '<foreignObject width="80" height="24"><div xmlns="http://www.w3.org/1999/xhtml">مخصص</div></foreignObject>'
    }, theme)!;
    const fo = group.querySelector('foreignObject')!;
    expect(fo.getAttribute('x')).toBe('-80');
    expect(fo.getAttribute('direction')).toBe('rtl');
    expect(fo.getAttribute('width')).toBe('80');
  });

  it('honors a standalone mc-label dir attribute and updates when it changes', () => {
    if (!customElements.get('mc-label')) customElements.define('mc-label', MCLabelElement);
    const label = document.createElement('mc-label') as MCLabelElement;
    label.setAttribute('dir', 'rtl');
    label.setAttribute('text', 'مرحبا');
    document.body.appendChild(label);
    expect(label.shadowRoot?.querySelector('.mc-label-text')?.getAttribute('direction')).toBe('rtl');
    label.setAttribute('dir', 'ltr');
    expect(label.shadowRoot?.querySelector('.mc-label-text')?.getAttribute('direction')).toBe('ltr');
  });
});

describe('RTL legend and marker placement', () => {
  const items: LegendItem[] = [
    { id: 'first', label: 'السلسلة الأولى', color: '#123', swatch: 'square' },
    { id: 'second', label: 'السلسلة الثانية', color: '#456', swatch: 'line' },
    { id: 'third', label: 'الثالثة', color: '#789', swatch: 'area' }
  ];

  it.each(['top', 'bottom', 'left', 'right'] as const)('mirrors %s legend positions without changing sizes or data order', (position) => {
    const engine = new LabelEngine();
    const cfg = createDefaultLegendConfig({ position, padding: { left: 13, right: 21 } });
    const measure = (text: string, opts?: Partial<LabelDescriptor>) => engine.measure(text, opts, theme);
    const ltr = computeLegendLayout(items, cfg, 250, 45, measure, theme);
    const rtl = computeLegendLayout(items, cfg, 250, 45, measure, theme, 'rtl');
    expect(rtl.items.map((entry) => entry.item.id)).toEqual(items.map((item) => item.id));
    expect(rtl.boxWidth).toBe(ltr.boxWidth);
    expect(rtl.boxHeight).toBe(ltr.boxHeight);
    rtl.items.forEach((entry, index) => {
      const reflection = position === 'top' || position === 'bottom'
        ? 250 + cfg.padding.left - cfg.padding.right
        : 2 * cfg.padding.left + rtl.contentWidth;
      expect(entry.x).toBeCloseTo(reflection - ltr.items[index].x - entry.width);
      expect(entry.y).toBe(ltr.items[index].y);
      expect(Number.isFinite(entry.x) && Number.isFinite(entry.width)).toBe(true);
    });
  });

  it.each(['ltr', 'rtl'] as const)('keeps every %s legend label separate from its square, line, or area swatch', (direction) => {
    const ctx = makeContext(direction);
    renderUnifiedLegendLayer(ctx, items);
    const groups = Array.from(ctx.layerGroup.querySelectorAll<SVGGElement>('.mc-legend-item'));
    expect(groups.length).toBe(items.length);
    groups.forEach((group) => {
      const swatch = group.querySelector('.mc-legend-swatch')!;
      const label = group.querySelector('.mc-label')!;
      const text = label.querySelector('text')!;
      const labelX = Number(label.getAttribute('transform')!.match(/translate\(([^,]+)/)![1]);
      const swatchLeft = Number(swatch.getAttribute('x') ?? swatch.getAttribute('x1'));
      const swatchRight = swatch.hasAttribute('width')
        ? swatchLeft + Number(swatch.getAttribute('width')) : Number(swatch.getAttribute('x2'));
      expect(text.getAttribute('direction')).toBe(direction);
      expect(text.getAttribute('text-anchor')).toBe('start');
      if (direction === 'rtl') expect(labelX).toBeLessThan(swatchLeft);
      else expect(labelX).toBeGreaterThan(swatchRight);
    });
  });

  it.each(['left', 'right'] as const)('keeps a marker annotation on the physical %s side in RTL', (position) => {
    const ctx = makeContext('rtl');
    const engine = new MarkerEngine();
    ctx.markers = engine.resolveMarkers([{
      id: 'threshold', value: 42, axis: 'y', label: 'الحد',
      annotation: { text: 'حد 42', position, background: '#eee' }
    }], undefined, (value: number) => value, ctx.innerWidth, ctx.innerHeight);
    engine.renderMarkersLayer(ctx);
    const annotation = ctx.layerGroup.querySelector(`.mc-marker-annotation--${position}`)!;
    const text = annotation.querySelector('text')!;
    const bg = annotation.querySelector('.mc-label-bg')!;
    expect(text.getAttribute('direction')).toBe('rtl');
    expect(text.getAttribute('text-anchor')).toBe(position === 'left' ? 'start' : 'end');
    const left = Number(bg.getAttribute('x'));
    if (position === 'left') expect(left).toBeLessThan(0);
    else expect(left).toBeGreaterThanOrEqual(-6);
  });

  it('localizes legend announcements and numeric tooltip text without changing raw values', () => {
    const ctx = makeContext('rtl');
    ctx.i18n = createChartI18n({
      locale: 'ar-EG', direction: 'rtl',
      messages: { legend: 'مفتاح الرسم', legendItem: 'سلسلة {{label}}', value: 'القيمة' }
    });
    renderUnifiedLegendLayer(ctx, [{ id: 'sales', label: 'مبيعات', color: '#123', value: 1234.5 }]);
    expect(ctx.layerGroup.querySelector('.mc-legend')?.getAttribute('aria-label')).toBe('مفتاح الرسم');
    const item = ctx.layerGroup.querySelector('.mc-legend-item')!;
    expect(item.getAttribute('aria-label')).toBe('سلسلة مبيعات');
    item.dispatchEvent(new FocusEvent('focus'));
    const payload = vi.mocked(ctx.showLegendTooltip).mock.calls[0][0] as Record<string, unknown>;
    expect(payload.label).toBe('القيمة');
    expect(payload.value).toBe(1234.5);
    expect(payload.formattedValue).toBe(new Intl.NumberFormat('ar-EG', {
      useGrouping: false, maximumFractionDigits: 20
    }).format(1234.5));
  });

  it('localizes icon-only marker annotations and keeps marker numeric geometry and events raw', () => {
    const ctx = makeContext('rtl');
    ctx.i18n = createChartI18n({
      locale: 'ar-EG', direction: 'rtl',
      messages: { markerAnnotation: 'تعليق {{label}}', lineMarker: 'حد خطي', condition: 'شرط {{condition}}' }
    });
    const engine = new MarkerEngine();
    ctx.markers = engine.resolveMarkers([{
      id: 'limit', axis: 'y', value: 12.5, condition: 'above',
      annotation: { icon: '!', position: 'right' }
    }], undefined, (value: number) => value * 2, ctx.innerWidth, ctx.innerHeight);
    engine.renderMarkersLayer(ctx);
    const annotation = ctx.layerGroup.querySelector('.mc-marker-annotation')!;
    expect(annotation.getAttribute('aria-label')).toBe('تعليق limit');
    expect(ctx.layerGroup.querySelector('.mc-marker-line')?.getAttribute('y1')).toBe('25');
    annotation.dispatchEvent(new FocusEvent('focus'));
    const payload = vi.mocked(ctx.showTooltip).mock.calls[0][0] as Record<string, unknown>;
    expect(payload.label).toBe('حد خطي');
    expect(payload.value).toBe(12.5);
    expect(payload.formattedValue).toBe(ctx.i18n.formatNumber(12.5));
    expect(payload.badge).toBe(`شرط above ${ctx.i18n.formatNumber(12.5)}`);
    expect((payload.datum as { value: number }).value).toBe(12.5);
  });
});
