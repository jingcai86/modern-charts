import { AnimationEngine } from './animation-engine';
import type { ChartRenderContext } from './types';

const SVG_NS = 'http://www.w3.org/2000/svg';
const localPaintReference = /url\(\s*(['"]?)#([^\s)'"]+)\1\s*\)/g;
const interactionAttribute = /^(?:aria-|data-(?:aria-|event-|item-component$)|role$|tabindex$|focusable$|on)/i;
const exitEasing = new AnimationEngine();
let exitSequence = 0;

interface ItemSnapshot {
  data: unknown;
  marks: Map<string, SVGElement[]>;
  definitions: Map<string, Element>;
  transform: string | null;
}

function subtree(element: Element): Element[] {
  return [element, ...element.querySelectorAll('*')];
}

function collectDefinitions(svg: SVGSVGElement): Map<string, Element> {
  const definitions = new Map<string, Element>();
  for (const definition of svg.querySelector('.mc-chart-defs')?.children ?? []) {
    for (const element of subtree(definition)) {
      if (element.id) definitions.set(element.id, definition);
    }
  }
  return definitions;
}

function copyDepartingMarks(
  marks: SVGElement[],
  previous: ItemSnapshot,
  root: SVGGElement
): SVGGElement {
  const document = root.ownerDocument;
  const overlay = document.createElementNS(SVG_NS, 'g');
  overlay.setAttribute('data-item-transition', 'exit');
  overlay.setAttribute('aria-hidden', 'true');
  overlay.setAttribute('pointer-events', 'none');
  if (previous.transform) overlay.setAttribute('transform', previous.transform);

  const definitions = document.createElementNS(SVG_NS, 'defs');
  const prefix = `mc-exit-${++exitSequence}-`;
  const clonedIds = new Map<string, string>();

  const copyDefinition = (id: string): string => {
    const knownId = clonedIds.get(id);
    if (knownId) return knownId;
    const definition = previous.definitions.get(id);
    if (!definition) return id;
    const copy = definition.cloneNode(true) as Element;
    const elements = subtree(copy);
    for (const element of elements) {
      if (!element.id) continue;
      const copiedId = prefix + element.id;
      clonedIds.set(element.id, copiedId);
      element.id = copiedId;
    }
    definitions.appendChild(copy);
    for (const element of elements) rewriteReferences(element);
    return clonedIds.get(id) ?? id;
  };

  function rewriteReferences(element: Element): void {
    for (const { name, localName, namespaceURI, value } of Array.from(element.attributes)) {
      const rewritten = localName === 'href' && value.startsWith('#')
        ? `#${copyDefinition(value.slice(1))}`
        : value.replace(localPaintReference, (_, _quote, id: string) => `url(#${copyDefinition(id)})`);
      if (rewritten !== value) element.setAttributeNS(namespaceURI, name, rewritten);
    }
  }

  for (const mark of marks) {
    const copy = mark.cloneNode(true) as SVGElement;
    for (const element of subtree(copy)) {
      for (const { name } of Array.from(element.attributes)) {
        if (name === 'id' || interactionAttribute.test(name)) element.removeAttribute(name);
      }
      (element as SVGElement).style.pointerEvents = 'none';
      rewriteReferences(element);
    }

    const transforms: string[] = [];
    for (let parent = mark.parentElement; parent && !parent.isSameNode(root); parent = parent.parentElement) {
      const transform = parent.getAttribute('transform');
      if (transform) transforms.unshift(transform);
    }
    if (transforms.length === 0) {
      overlay.appendChild(copy);
    } else {
      const group = document.createElementNS(SVG_NS, 'g');
      group.setAttribute('transform', transforms.join(' '));
      group.appendChild(copy);
      overlay.appendChild(group);
    }
  }
  if (definitions.childElementCount > 0) overlay.prepend(definitions);
  return overlay;
}

/** Tracks built-in marks so only data items entering or leaving a chart animate. */
export class ItemTransitions {
  #previous?: ItemSnapshot;
  #pending?: { context: object; marks: Map<string, SVGElement[]> };
  #exit?: { overlay: SVGGElement; animation: Animation };

  prepare<T>(ctx: ChartRenderContext<T>): void {
    const previous = this.#previous;
    const changedData = previous?.data !== ctx.data;
    const marks = new Map<string, SVGElement[]>();
    this.#pending = { context: ctx, marks };

    const animate = ctx.animateItem;
    ctx.animateItem = (element, spec) => {
      const { itemKey } = spec;
      if (itemKey === undefined) {
        animate(element, spec);
        return;
      }

      const items = marks.get(itemKey);
      const entered = changedData && (items?.length ?? 0) >= (previous?.marks.get(itemKey)?.length ?? 0);
      if (items) items.push(element);
      else marks.set(itemKey, [element]);

      if (!previous) animate(element, spec);
      else if (entered) animate(element, { ...spec, index: 0 });
      else element.setAttribute('data-animated', 'false');
    };
  }

  finish<T>(ctx: ChartRenderContext<T>): void {
    const pending = this.#pending;
    if (pending?.context !== ctx) return;
    this.#pending = undefined;
    const previous = this.#previous;
    this.#previous = {
      data: ctx.data,
      marks: pending.marks,
      definitions: collectDefinitions(ctx.svg),
      transform: ctx.rootGroup.getAttribute('transform')
    };

    const { enabled, duration, easing } = ctx.animationConfig;
    const viewport = ctx.rootGroup.parentElement;
    const prefersReducedMotion = ctx.svg.ownerDocument.defaultView
      ?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (
      !previous || previous.data === ctx.data || !enabled || duration <= 0 ||
      !viewport || typeof ctx.rootGroup.animate !== 'function' ||
      prefersReducedMotion
    ) return;

    const departing = [...previous.marks].flatMap(([key, marks]) =>
      marks.slice(pending.marks.get(key)?.length ?? 0)
    );
    if (departing.length === 0) return;

    let exitGroup: SVGGElement | undefined;
    try {
      const overlay = copyDepartingMarks(departing, previous, ctx.rootGroup);
      exitGroup = overlay;
      viewport.appendChild(overlay);
      const animation = overlay.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration,
        easing: exitEasing.getCssEasing(easing),
        fill: 'forwards'
      });
      const exit = { overlay, animation };
      const cleanup = () => {
        if (this.#exit === exit) this.#exit = undefined;
        overlay.remove();
      };
      void animation.finished.then(cleanup, cleanup);
      this.#exit = exit;
    } catch {
      exitGroup?.remove();
    }
  }

  cancel(clearSnapshot: boolean): void {
    this.#pending = undefined;
    if (clearSnapshot) this.#previous = undefined;
    const exit = this.#exit;
    if (!exit) return;
    this.#exit = undefined;
    exit.overlay.remove();
    exit.animation.cancel();
  }
}
