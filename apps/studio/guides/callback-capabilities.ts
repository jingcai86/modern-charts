import { layoutWithLines, prepareWithSegments } from '@chenglou/pretext';
import type { ChartRenderContext, LabelDescriptor } from '../../../src/index';
import { escapeHtml } from '../utils/html';

const svgNamespace = 'http://www.w3.org/2000/svg';
const unsafeKeys = new Set(['__proto__', 'constructor', 'prototype']);
const htmlTags = new Set(['b', 'br', 'code', 'div', 'em', 'i', 'li', 'ol', 'p', 'small', 'span', 'strong', 'ul']);
const svgTags = new Set(['circle', 'ellipse', 'g', 'line', 'path', 'polygon', 'polyline', 'rect', 'svg', 'text', 'tspan']);
const commonAttributes = new Set(['aria-hidden', 'aria-label', 'class', 'role', 'title']);
const svgAttributes = new Set([
  'cx', 'cy', 'd', 'dominant-baseline', 'dx', 'dy', 'fill', 'fill-opacity', 'font-family', 'font-size',
  'font-weight', 'height', 'opacity', 'pointer-events', 'points', 'r', 'rx', 'ry', 'stroke', 'stroke-dasharray',
  'stroke-opacity', 'stroke-width', 'text-anchor', 'transform', 'viewBox', 'width', 'x', 'x1', 'x2', 'y', 'y1', 'y2'
]);
const styles = new Set([
  'align-items', 'background', 'background-color', 'border', 'border-radius', 'border-top', 'color', 'cursor',
  'display', 'fill', 'font', 'font-family', 'font-size', 'font-weight', 'gap', 'justify-content', 'line-height',
  'margin', 'margin-top', 'opacity', 'padding', 'padding-top', 'pointer-events', 'stroke', 'text-align'
]);
const pointerEvents = new Set(['pointerenter', 'pointerleave', 'pointermove', 'pointerdown', 'pointerup', 'click']);
const chartFields = [
  'chartType', 'config', 'data', 'width', 'height', 'innerWidth', 'innerHeight', 'margin', 'theme', 'isInteractive'
] as const;
const maxText = 16_384;
const maxRows = 5_000;

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
type ChartContext = ChartRenderContext<unknown>;
type DefaultRenderer = () => Node;
type CallbackEvent = { index: number; data: { clientX: number; clientY: number } };

interface PreparedCallback {
  input: {
    args: JsonValue[];
    bindings: Record<string, JsonValue>;
    chart?: { index: number; xScale: boolean; yScale: boolean };
    defaultRenderIndex?: number;
  };
  chartContext?: ChartContext;
  defaultRender?: DefaultRenderer;
  invoke: (name: string, args: unknown) => unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function copyData(value: unknown): JsonValue | undefined {
  return copyDataWithinBudget(value, { remaining: 50_000 }, 0);
}

function copyDataWithinBudget(value: unknown, budget: { remaining: number }, depth: number): JsonValue | undefined {
  if (budget.remaining-- <= 0 || depth > 24) return undefined;
  if (value === null || typeof value === 'boolean' || isNumber(value)) return value;
  if (typeof value === 'string') return value.slice(0, maxText);
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  if (Array.isArray(value)) {
    return value.slice(0, Math.min(maxRows, budget.remaining)).map((item) =>
      copyDataWithinBudget(item, budget, depth + 1) ?? null
    );
  }
  if (!isRecord(value)) return undefined;

  const data: Record<string, JsonValue> = Object.create(null);
  for (const [key, property] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
    if (unsafeKeys.has(key) || !property.enumerable || !Object.hasOwn(property, 'value')) continue;
    const copied = copyDataWithinBudget(property.value, budget, depth + 1);
    if (copied !== undefined) data[key] = copied;
    if (budget.remaining <= 0) break;
  }
  return data;
}

function isChartContext(value: unknown): value is ChartContext {
  return isRecord(value)
    && Object.getOwnPropertyDescriptor(value, 'layerGroup')?.value instanceof SVGElement
    && typeof Object.getOwnPropertyDescriptor(value, 'renderLabel')?.value === 'function';
}

function snapshotChart(context: ChartContext): JsonValue {
  const chart = Object.fromEntries(chartFields.map((field) => [field, context[field]]));
  chart.thresholds = { matchedItems: context.thresholds?.matchedItems };
  return copyData(chart) ?? null;
}

function readDefaultRenderer(args: unknown[], path: readonly string[]) {
  const type = path.at(-1);
  const index = type === 'labelRenderer' ? 2 : type === 'renderer' ? (path.includes('tooltip') ? 1 : 2) : -1;
  const render = args[index];
  return typeof render === 'function' ? { index, render: render as DefaultRenderer } : undefined;
}

export function prepareCallbackInvocation(
  args: unknown[],
  bindings: Record<string, unknown>,
  path: readonly string[] = []
): PreparedCallback {
  const context = args.find(isChartContext);
  const renderer = readDefaultRenderer(args, path);
  const input: PreparedCallback['input'] = {
    args: args.map((value) => isChartContext(value) ? snapshotChart(value) : copyData(value) ?? null),
    bindings: Object.create(null)
  };
  if (context) {
    input.chart = {
      index: args.indexOf(context),
      xScale: typeof context.xScale === 'function',
      yScale: typeof context.yScale === 'function'
    };
  }
  if (renderer) input.defaultRenderIndex = renderer.index;

  const canLayoutText = Object.hasOwn(bindings, 'layoutWithLines') && bindings.layoutWithLines === layoutWithLines
    && Object.hasOwn(bindings, 'prepareWithSegments') && bindings.prepareWithSegments === prepareWithSegments;
  for (const [name, value] of Object.entries(bindings)) {
    if (unsafeKeys.has(name)) continue;
    if (canLayoutText && (name === 'layoutWithLines' || name === 'prepareWithSegments')) {
      input.bindings[name] = { $mcBinding: name };
    } else {
      const data = copyData(value);
      if (data !== undefined) input.bindings[name] = data;
    }
  }

  return {
    input,
    chartContext: context,
    defaultRender: renderer?.render,
    invoke: (name, request) => {
      if (!Array.isArray(request)) return undefined;
      if (name === 'layoutWithLines' && canLayoutText) return invokeTextLayout(request);
      if (context) return invokeChart(context, name, request);
    }
  };
}

function invokeTextLayout([description, width, lineHeight]: unknown[]): unknown {
  if (!isRecord(description) || typeof description.text !== 'string' || typeof description.font !== 'string') return;
  if (description.font.length > 200 || description.text.length > maxText || !isNumber(lineHeight) || lineHeight <= 0) return;
  const maxWidth = width === null ? Infinity : width;
  if (typeof maxWidth !== 'number' || maxWidth <= 0) return;
  return layoutWithLines(prepareWithSegments(description.text, description.font), maxWidth, lineHeight);
}

function readPoints<T extends number[]>(value: unknown, length: number): T[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, maxRows).filter((item): item is T =>
    Array.isArray(item) && item.length === length && item.every(isNumber)
  );
}

function invokeChart(context: ChartContext, name: string, [first, second]: unknown[]): unknown {
  const { d3 } = context;
  switch (name) {
    case 'xScale':
    case 'yScale': {
      const scale = context[name];
      if (typeof scale === 'function' && (isNumber(first) || typeof first === 'string')) return scale(first);
      return undefined;
    }
    case 'mean':
      return Array.isArray(first) ? d3.mean(first.slice(0, maxRows).filter(isNumber)) : undefined;
    case 'quantile':
      return Array.isArray(first) && isNumber(second) && second >= 0 && second <= 1
        ? d3.quantile(first.slice(0, maxRows).filter(isNumber), second) : undefined;
    case 'format': {
      if (typeof first !== 'string' || first.length > 24 || !isNumber(second)
        || Array.from(first.matchAll(/\d+/g)).some(([width]) => Number(width) > 100)) return undefined;
      return d3.format(first)(second);
    }
    case 'areaPath':
    case 'linePath': {
      const curve = second === 'curveMonotoneX' || second === 'monotoneX' ? d3.curveMonotoneX : d3.curveLinear;
      return name === 'areaPath'
        ? d3.area<[number, number, number]>().x(d => d[0]).y0(d => d[1]).y1(d => d[2])
          .curve(curve)(readPoints<[number, number, number]>(first, 3))
        : d3.line<[number, number]>().x(d => d[0]).y(d => d[1]).curve(curve)(readPoints<[number, number]>(first, 2));
    }
    default:
      return undefined;
  }
}

function safeStyleValue(value: string): boolean {
  if (value.length > 256) return false;
  const withoutColors = value.replace(/(?:rgba?|hsla?)\([\d.,% +\-/]+\)/gi, '');
  return /^[\w \t#.%,'"+-]*$/.test(withoutColors);
}

function applyStyle(element: HTMLElement | SVGElement, name: string, value: unknown): void {
  const property = name.replace(/[A-Z]/g, (character) => `-${character.toLowerCase()}`);
  if (styles.has(property) && typeof value === 'string' && safeStyleValue(value)) {
    element.style.setProperty(property, value);
  }
}

function renderStyles(element: HTMLElement | SVGElement, value: unknown): void {
  if (!isRecord(value)) return;
  for (const [name, style] of Object.entries(value)) {
    if (name === 'cssText' && typeof style === 'string') {
      for (const declaration of style.slice(0, maxText).split(';')) {
        const colon = declaration.indexOf(':');
        if (colon !== -1) applyStyle(element, declaration.slice(0, colon).trim(), declaration.slice(colon + 1).trim());
      }
    } else {
      applyStyle(element, name, style);
    }
  }
}

function copyAttributes(element: Element, attributes: unknown, isSvg: boolean): void {
  if (!isRecord(attributes)) return;
  for (const [name, raw] of Object.entries(attributes)) {
    if (!commonAttributes.has(name) && !(isSvg && svgAttributes.has(name))) continue;
    if (typeof raw !== 'string' && !isNumber(raw)) continue;
    const value = String(raw).slice(0, maxText);
    if ((name === 'fill' || name === 'stroke' || name === 'font-family') && !safeStyleValue(value)) continue;
    element.setAttribute(name, value);
  }
}

function escapeTooltipText(text: string): string {
  // The demo callbacks may have already escaped a caption before interpolating it.
  return text.replace(/[<>]|&(?!#(?:x[0-9a-f]{1,6}|\d{1,7});|[a-z][a-z0-9]{0,31};)/gi, escapeHtml);
}

function safeTooltipHtml(rawHtml: string): string {
  const html = rawHtml.slice(0, maxText);
  const tags: string[] = [];
  const output: string[] = [];
  let cursor = 0;
  while (cursor < html.length) {
    const start = html.indexOf('<', cursor);
    const end = start < 0 ? -1 : html.indexOf('>', start + 1);
    if (end < 0) break;
    output.push(escapeTooltipText(html.slice(cursor, start)));
    const member = html.slice(start + 1, end).trim().toLowerCase();
    const closing = member.startsWith('/');
    const tag = /^[a-z][a-z0-9]*/.exec(closing ? member.slice(1) : member)?.[0];
    if (tag && htmlTags.has(tag)) {
      // Emit only literal tag names and never forward attributes.
      if (closing && tags.at(-1) === tag) output.push(`</${tags.pop()}>`);
      if (!closing) {
        output.push(`<${tag}>`);
        if (tag !== 'br') tags.push(tag);
      }
    }
    cursor = end + 1;
  }
  output.push(escapeTooltipText(html.slice(cursor)), ...tags.reverse().map(tag => `</${tag}>`));
  return output.join('');
}

function labelDescriptor(value: unknown): LabelDescriptor | undefined {
  if (!isRecord(value) || typeof value.text !== 'string' || !isNumber(value.x) || !isNumber(value.y)) return;
  const descriptor: LabelDescriptor = { type: 'custom', text: value.text.slice(0, maxText), x: value.x, y: value.y };
  for (const key of ['fontSize', 'fontWeight', 'borderRadius', 'maxWidth', 'maxHeight', 'rotation', 'maxChars', 'maxLines'] as const) {
    if (isNumber(value[key])) descriptor[key] = value[key];
  }
  if (value.anchor === 'start' || value.anchor === 'middle' || value.anchor === 'end') descriptor.anchor = value.anchor;
  for (const key of ['background', 'color', 'borderColor', 'fontFamily'] as const) {
    const style = value[key];
    if (typeof style === 'string' && safeStyleValue(style)) descriptor[key] = style;
  }
  if (isRecord(value.padding)) {
    const { top, right, bottom, left } = value.padding;
    if (isNumber(top) && isNumber(right) && isNumber(bottom) && isNumber(left)) {
      descriptor.padding = { top, right, bottom, left };
    }
  }
  return descriptor;
}

interface MaterializeContext {
  prepared: PreparedCallback;
  document: Document;
  replayEvent: (event: CallbackEvent) => void;
  remaining: number;
}

function connectPointerEvents(
  element: Element,
  events: unknown,
  replayEvent: MaterializeContext['replayEvent']
): void {
  if (!Array.isArray(events)) return;
  for (const event of events.slice(0, pointerEvents.size)) {
    if (!isRecord(event) || typeof event.type !== 'string' || !pointerEvents.has(event.type)
      || !isNumber(event.index) || !Number.isSafeInteger(event.index) || event.index < 0) continue;
    const index = event.index;
    element.addEventListener(event.type, (pointer) => {
      if (!(pointer instanceof MouseEvent)) return;
      replayEvent({ index, data: { clientX: pointer.clientX, clientY: pointer.clientY } });
    });
  }
}

function materialize(value: unknown, context: MaterializeContext, depth: number, parent?: Element): Node | undefined {
  if (depth > 32 || context.remaining-- <= 0) return undefined;
  if (typeof value === 'string') return context.document.createTextNode(value.slice(0, maxText));
  if (!isRecord(value)) return undefined;
  if (value.kind === 'default') return context.prepared.defaultRender?.();
  if (value.kind === 'label' && parent instanceof SVGElement) {
    const descriptor = labelDescriptor(value.descriptor);
    if (descriptor) context.prepared.chartContext?.renderLabel(parent, descriptor);
    return undefined;
  }
  if (value.kind !== 'node' || typeof value.tag !== 'string') return undefined;
  const isSvg = value.namespace === 'svg';
  if (isSvg ? !svgTags.has(value.tag) : value.namespace !== 'html' || !htmlTags.has(value.tag)) return undefined;

  const element = isSvg
    ? context.document.createElementNS(svgNamespace, value.tag) as SVGElement
    : context.document.createElement(value.tag);
  copyAttributes(element, value.attributes, isSvg);
  renderStyles(element, value.style);
  connectPointerEvents(element, value.events, context.replayEvent);
  if (typeof value.text === 'string') element.textContent = value.text.slice(0, maxText);
  materializeChildren(element, value.children, context, depth + 1);
  return element;
}

function materializeChildren(parent: Element, children: unknown, context: MaterializeContext, depth: number): void {
  if (!Array.isArray(children)) return;
  for (const child of children) {
    if (context.remaining <= 0) return;
    const node = materialize(child, context, depth, parent);
    if (node) parent.append(node);
  }
}

export function applyCallbackOutput(
  prepared: PreparedCallback,
  output: unknown,
  path: readonly string[],
  replayEvent: (event: CallbackEvent) => void
): unknown {
  if (!isRecord(output)) return undefined;
  const chart = prepared.chartContext;
  const ownerDocument = chart?.layerGroup.ownerDocument ?? document;
  const context: MaterializeContext = { prepared, document: ownerDocument, replayEvent, remaining: 1_500 };
  if (chart && isRecord(output.layer)) materializeChildren(chart.layerGroup, output.layer.children, context, 0);
  if (chart && Array.isArray(output.actions)) {
    for (const action of output.actions.slice(0, 32)) {
      if (!isRecord(action)) continue;
      if (action.kind === 'hide') chart.hideTooltip();
      if (action.kind === 'show' && typeof action.html === 'string' && isNumber(action.x) && isNumber(action.y)) {
        chart.showTooltip(safeTooltipHtml(action.html), action.x, action.y);
      }
    }
  }

  const value = output.value;
  if (isRecord(value) && (value.kind === 'node' || value.kind === 'default')) return materialize(value, context, 0);
  if (typeof value === 'string') {
    if (path.includes('tooltip')) return safeTooltipHtml(value);
    if (path.includes('layers') || path.at(-1) === 'labelRenderer' || path.at(-1) === 'renderer') return escapeHtml(value);
  }
  return copyData(value);
}
