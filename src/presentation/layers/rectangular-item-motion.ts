import type { ItemMotion } from '../../core/chart-item-join';
import { parseColorToRgb } from '../../core/theme';

type ItemBox = [x: number, y: number, width: number, height: number];

type ItemFrame = [mark: SVGElement, box: ItemBox, fill: string];

interface MovingLabel {
  draw?: (translation?: string, fade?: number) => void;
  translation?: string;
  fade?: number;
}

const displayedItems = new WeakMap<SVGGElement, ItemFrame>();
const movingLabels = new WeakMap<object, MovingLabel>();

function parseFill(raw: string): [number, number, number, number] | null {
  const fill = raw.trim();
  if (fill.toLowerCase() === 'transparent') return [0, 0, 0, 0];
  const rgb = parseColorToRgb(fill);
  if (!rgb) return null;

  if (fill.startsWith('#')) {
    const alpha = fill.length === 5 ? fill[4].repeat(2) : fill.length === 9 ? fill.slice(-2) : 'ff';
    return [...rgb, Number.parseInt(alpha, 16) / 255];
  }
  const body = fill.slice(fill.indexOf('(') + 1, -1);
  const token = body.includes('/') ? body.split('/')[1] : body.split(',')[3];
  const alpha = token ? Number.parseFloat(token) / (token.includes('%') ? 100 : 1) : 1;
  return [...rgb, Number.isFinite(alpha) ? Math.max(0, Math.min(1, alpha)) : 1];
}

function tweenFill(from: string, to: string) {
  const start = parseFill(from);
  const end = parseFill(to);
  if (!start || !end) return undefined;
  return (progress: number): string => {
    const [red, green, blue, alpha] = interpolateBox(start, end, progress);
    const rgb = `${Math.round(red)}, ${Math.round(green)}, ${Math.round(blue)}`;
    return alpha === 1 ? `rgb(${rgb})` : `rgba(${rgb}, ${alpha})`;
  };
}

function lerp(from: number, to: number, progress: number): number {
  return from + (to - from) * progress;
}

function labelsFor(item: object): MovingLabel {
  let label = movingLabels.get(item);
  if (!label) {
    label = {};
    movingLabels.set(item, label);
  }
  return label;
}

function readItemBox(mark: SVGElement): ItemBox {
  const read = (name: string) => Number(mark.getAttribute(name));
  if (mark.localName === 'circle') {
    const radius = read('r');
    return [read('cx') - radius, read('cy') - radius, radius * 2, radius * 2];
  }
  return [read('x'), read('y'), read('width'), read('height')];
}

function collapse([x, y, width, height]: ItemBox): ItemBox {
  return [x + width / 2, y + height / 2, 0, 0];
}

function interpolateBox(from: ItemBox, to: ItemBox, progress: number): ItemBox {
  return from.map((value, index) => lerp(value, to[index], progress)) as ItemBox;
}

function placeBox(group: SVGGElement, [x, y, width, height]: ItemBox, frame: ItemBox): void {
  const scaleX = frame[2] / width;
  const scaleY = frame[3] / height;
  group.setAttribute('transform', `translate(${frame[0] - x * scaleX},${frame[1] - y * scaleY}) scale(${scaleX},${scaleY})`);
}

export function bindRectangularItemLabel(item: object, element: SVGElement | null): void {
  if (!element) return;
  const label = labelsFor(item);
  const original = element.getAttribute('transform');
  const opacity = element.style.opacity;
  label.draw = (translation, fade) => {
    const transform = translation ? `${translation} ${original ?? ''}` : original;
    if (transform !== null) element.setAttribute('transform', transform);
    else element.removeAttribute('transform');
    element.style.opacity = String(fade ?? opacity);
  };
  if (label.translation || label.fade !== undefined) label.draw(label.translation, label.fade);
}

export function renderRectangularItem(
  group: SVGGElement,
  mark: SVGElement,
  item: object,
  motion?: ItemMotion,
  animateFill = false
): void {
  const previous = displayedItems.get(group);
  const target = readItemBox(mark);
  const fill = mark.getAttribute('fill') ?? '';
  const next: ItemFrame = [mark, target, fill];
  displayedItems.set(group, next);
  group.replaceChildren(mark);
  group.removeAttribute('transform');
  if (!motion) return;

  const from = previous?.[1] ?? collapse(target);
  const moves = from.some((value, index) => value !== target[index]);
  const paint = previous && animateFill && previous[2] !== fill ? tweenFill(previous[2], fill) : undefined;
  if (!moves && !paint) return;

  const label = labelsFor(item);
  motion((progress) => {
    if (moves) {
      const box = progress === 1 ? target : interpolateBox(from, target, progress);
      next[1] = box;
      placeBox(group, target, box);
      const dx = box[0] - target[0] + (box[2] - target[2]) / 2;
      const dy = box[1] - target[1] + (box[3] - target[3]) / 2;
      label.translation = progress < 1 ? `translate(${dx},${dy})` : undefined;
      label.fade = !previous && progress < 1 ? progress : undefined;
      label.draw?.(label.translation, label.fade);
    }
    if (paint) {
      next[2] = paint(progress);
      mark.style.fill = next[2];
    }
  }, () => {
    group.removeAttribute('transform');
    if (paint) mark.style.removeProperty('fill');
    next[2] = fill;
    movingLabels.delete(item);
  });
}

export function retractRectangularItem(group: SVGGElement, motion: ItemMotion): void {
  const previous = displayedItems.get(group);
  if (!previous) return;
  const [mark, from] = previous;
  const painted = readItemBox(mark);
  const to = collapse(from);
  motion((progress) => {
    previous[1] = interpolateBox(from, to, progress);
    placeBox(group, painted, previous[1]);
  });
}
