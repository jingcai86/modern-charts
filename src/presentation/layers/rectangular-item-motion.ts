import type { ItemMotion } from '../../core/chart-item-join';

type ItemBox = [x: number, y: number, width: number, height: number];

type ItemFrame = [displayed: ItemBox, painted: ItemBox];

interface MovingLabel {
  draw?: (translation?: string, fade?: number) => void;
  translation?: string;
  fade?: number;
}

const displayedItems = new WeakMap<SVGGElement, ItemFrame>();
const movingLabels = new WeakMap<object, MovingLabel>();

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
  return from.map((value, index) => value + (to[index] - value) * progress) as ItemBox;
}

function placeBox(group: SVGGElement, [x, y, width, height]: ItemBox, frame: ItemBox): void {
  const scaleX = frame[2] / width;
  const scaleY = frame[3] / height;
  group.setAttribute('transform', `translate(${frame[0] - x * scaleX},${frame[1] - y * scaleY}) scale(${scaleX},${scaleY})`);
}

export function bindRectangularItemLabel(item: object, element: SVGElement | null): void {
  if (!element) return;
  const label = labelsFor(item);
  const original = element.getAttribute('transform') ?? '';
  const opacity = element.style.opacity;
  label.draw = (translation = '', fade) => {
    element.setAttribute('transform', translation + original);
    element.style.opacity = String(fade ?? opacity);
  };
  if (label.translation) label.draw(label.translation, label.fade);
}

export function renderRectangularItem(
  group: SVGGElement,
  mark: SVGElement,
  item: object,
  motion?: ItemMotion
): void {
  const previous = displayedItems.get(group);
  const target = readItemBox(mark);
  const next: ItemFrame = [target, target];
  displayedItems.set(group, next);
  group.replaceChildren(mark);
  group.removeAttribute('transform');
  if (!motion) return;

  const from = previous?.[0] ?? collapse(target);
  if (from.every((value, index) => value === target[index])) return;

  const label = labelsFor(item);
  motion((progress) => {
    const box = progress === 1 ? target : interpolateBox(from, target, progress);
    next[0] = box;
    placeBox(group, target, box);
    const dx = box[0] - target[0] + (box[2] - target[2]) / 2;
    const dy = box[1] - target[1] + (box[3] - target[3]) / 2;
    label.translation = progress < 1 ? `translate(${dx},${dy}) ` : undefined;
    label.fade = !previous && progress < 1 ? progress : undefined;
    label.draw?.(label.translation, label.fade);
  }, () => group.removeAttribute('transform'));
}

export function retractRectangularItem(group: SVGGElement, motion: ItemMotion): void {
  const previous = displayedItems.get(group);
  if (!previous) return;
  const [from, painted] = previous;
  const to = collapse(from);
  motion((progress) => {
    previous[0] = interpolateBox(from, to, progress);
    placeBox(group, painted, previous[0]);
  });
}
