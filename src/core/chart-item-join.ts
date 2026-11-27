import { timer, type Timer } from 'd3';
import { AnimationEngine } from './animation-engine';
import { captureItemDefinitions, retainItemDefinitions } from './item-paint-defs';
import type { AnimationConfig } from './types';

type ItemMotion = (tick: (progress: number) => void, finish?: () => void) => void;

interface ItemUpdate {
  initial: boolean;
  entered: boolean;
  structureChanged: boolean;
  motion?: ItemMotion;
}

interface ItemLayer {
  groups: Map<string, SVGGElement>;
  exits: SVGGElement[];
  timer?: Timer;
}

const layers = new WeakMap<SVGGElement, ItemLayer>();
const easing = new AnimationEngine();

/** Keep one visual group per item while replacing its current event and ARIA targets. */
export function joinChartItems<T>(
  layer: SVGGElement,
  items: readonly T[],
  key: (item: T) => string,
  config: AnimationConfig,
  render: (group: SVGGElement, item: T, update: ItemUpdate) => void
): void {
  const previous = layers.get(layer);
  previous?.timer?.stop();
  previous?.exits.forEach(group => group.remove());

  const counts = new Map<string, number>();
  const keys = items.map(item => {
    const id = key(item);
    const count = counts.get(id) ?? 0;
    counts.set(id, count + 1);
    return `${id}\0${count}`;
  });
  const state: ItemLayer = { groups: new Map(), exits: [] };
  const initial = previous === undefined;
  const structureChanged = keys.length !== previous?.groups.size || keys.some(id => !previous?.groups.has(id));
  const frames: Array<{ tick: (progress: number) => void; finish?: () => void }> = [];
  const reducedMotion = layer.ownerDocument.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const motion: ItemMotion | undefined = !initial && config.enabled && config.duration > 0 && !reducedMotion
    ? (tick, finish) => {
        tick(0);
        frames.push({ tick, finish });
      }
    : undefined;

  items.forEach((item, index) => {
    const id = keys[index];
    const existing = previous?.groups.get(id);
    const group = existing ?? layer.ownerDocument.createElementNS(layer.namespaceURI, 'g') as SVGGElement;
    const atIndex = layer.children[index] ?? null;
    if (atIndex !== group) layer.insertBefore(group, atIndex);
    state.groups.set(id, group);
    render(group, item, { initial, entered: !existing, structureChanged, motion });
    captureItemDefinitions(group);
  });

  for (const [id, group] of previous?.groups ?? []) {
    if (state.groups.has(id)) continue;
    if (!motion) {
      group.remove();
      continue;
    }
    group.setAttribute('data-item-transition', 'exit');
    group.setAttribute('aria-hidden', 'true');
    group.style.pointerEvents = 'none';
    retainItemDefinitions(group);
    for (const mark of group.querySelectorAll<SVGElement>('[tabindex], [data-item-component]')) {
      mark.blur?.();
      mark.removeAttribute('tabindex');
      mark.removeAttribute('data-item-component');
      mark.removeAttribute('data-aria-id');
    }
    state.exits.push(group);
    motion(progress => { group.style.opacity = String(1 - progress); }, () => group.remove());
  }

  layers.set(layer, state);
  if (frames.length === 0) return;
  const ease = easing.getD3Easing(config.easing);
  state.timer = timer(elapsed => {
    const done = elapsed >= config.duration || !layer.isConnected;
    const progress = done ? 1 : ease(elapsed / config.duration);
    for (const frame of frames) {
      frame.tick(progress);
      if (done) frame.finish?.();
    }
    if (done) {
      state.timer?.stop();
      state.timer = undefined;
      state.exits = [];
    }
  });
}
