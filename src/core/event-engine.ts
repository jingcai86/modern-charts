import type {
  ChartConfig,
  ChartEventCategory,
  ChartEventHandler,
  ChartEventHandlers,
  ChartEventPayload,
  ChartEventTargetKind,
  ChartEventTargetRegistration,
  ChartEventType,
  ChartMargin
} from './types';

export const CHART_EVENT_TYPES: readonly ChartEventType[] = [
  'click',
  'dblclick',
  'contextmenu',
  'focus',
  'blur',
  'mouseover',
  'mouseout',
  'mouseenter',
  'mouseleave',
  'mousemove',
  'pointerdown',
  'pointerup',
  'keydown'
] as const;

export const EVENT_TYPE_TO_HANDLER_KEY: Record<
  ChartEventType,
  keyof ChartEventHandlers
> = {
  click: 'onClick',
  dblclick: 'onDoubleClick',
  contextmenu: 'onContextMenu',
  focus: 'onFocus',
  blur: 'onBlur',
  mouseover: 'onMouseOver',
  mouseout: 'onMouseOut',
  mouseenter: 'onMouseEnter',
  mouseleave: 'onMouseLeave',
  mousemove: 'onMouseMove',
  pointerdown: 'onPointerDown',
  pointerup: 'onPointerUp',
  keydown: 'onKeyDown'
};

const EVENT_TYPE_ALIASES: Record<string, ChartEventType> = {
  click: 'click',
  onclick: 'click',
  dblclick: 'dblclick',
  doubleclick: 'dblclick',
  ondoubleclick: 'dblclick',
  contextmenu: 'contextmenu',
  oncontextmenu: 'contextmenu',
  focus: 'focus',
  onfocus: 'focus',
  blur: 'blur',
  onblur: 'blur',
  mouseover: 'mouseover',
  onmouseover: 'mouseover',
  mouseout: 'mouseout',
  onmouseout: 'mouseout',
  mouseenter: 'mouseenter',
  onmouseenter: 'mouseenter',
  mouseleave: 'mouseleave',
  onmouseleave: 'mouseleave',
  mousemove: 'mousemove',
  onmousemove: 'mousemove',
  pointerdown: 'pointerdown',
  onpointerdown: 'pointerdown',
  pointerup: 'pointerup',
  onpointerup: 'pointerup',
  keydown: 'keydown',
  onkeydown: 'keydown'
};

/**
 * Normalizes an event key for `.on()` / `.off()` (supports e.g. `'click'`,
 * `'onClick'`, `'mouseEnter'`, `'item:click'`, `'barItem:mouseOver'`, `'axis:click'`, `'*'`).
 */
export function normalizeEventSubscriptionKey(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed === '*') return '*';
  const colonIdx = trimmed.indexOf(':');
  if (colonIdx > 0) {
    const scope = trimmed.slice(0, colonIdx).trim();
    const rawType = trimmed.slice(colonIdx + 1).trim().toLowerCase();
    const normType = EVENT_TYPE_ALIASES[rawType] ?? rawType;
    return `${scope}:${normType}`;
  }
  const lower = trimmed.toLowerCase();
  return EVENT_TYPE_ALIASES[lower] ?? lower;
}

export interface EventEngineHostContext {
  host: HTMLElement;
  svg: SVGSVGElement;
  getChartType: () => string;
  getConfig: () => ChartConfig<any>;
  getMargin: () => ChartMargin;
}

interface ResolvedTarget {
  element: Element;
  reg: ChartEventTargetRegistration;
}

const CANVAS_REGISTRATION: ChartEventTargetRegistration<undefined> = {
  target: 'canvas',
  category: 'canvas',
  id: undefined,
  data: undefined
};

/**
 * Unified Event Engine shared by all 10 charts in `MCBaseChart`.
 *
 * Uses a single capture-phase delegated listener set on the chart `<svg>` and
 * a `WeakMap<Element, ChartEventTargetRegistration>` so every item, axis tick/title,
 * legend entry, marker annotation, title, label, or empty canvas area emits
 * structured, consistent events with zero per-item listener leaks.
 */
export class EventEngine {
  private registry = new WeakMap<Element, ChartEventTargetRegistration>();
  private listeners = new Map<string, Set<ChartEventHandler<any>>>();
  private boundSvg: SVGSVGElement | null = null;
  private hostCtx: EventEngineHostContext | null = null;
  private activeHoverEl: Element | null = null;
  private activeHoverReg: ChartEventTargetRegistration | null = null;
  private cleanupFns: Array<() => void> = [];

  /**
   * Registers an SVG element with its target metadata and associated data payload.
   */
  public registerTarget<TData = any>(
    element: Element,
    registration: ChartEventTargetRegistration<TData>
  ): Element {
    this.registry.set(element, registration);
    element.setAttribute('data-event-target', registration.target);
    element.setAttribute('data-event-category', registration.category);
    if (registration.id !== undefined) {
      element.setAttribute('data-event-id', registration.id);
    }
    return element;
  }

  /**
   * Subscribes to a unified chart event (`'click'`, `'item:click'`, `'barItem:click'`,
   * `'axis:click'`, `'legend:mouseenter'`, `'canvas:click'`, `'*'`, etc.).
   * Returns an unsubscribe function.
   */
  public on<TData = any>(
    eventName: string,
    handler: ChartEventHandler<TData>
  ): () => void {
    const key = normalizeEventSubscriptionKey(eventName);
    let set = this.listeners.get(key);
    if (!set) {
      set = new Set();
      this.listeners.set(key, set);
    }
    set.add(handler as ChartEventHandler<any>);
    return () => this.off(eventName, handler);
  }

  /**
   * Unsubscribes a previously registered handler.
   */
  public off<TData = any>(
    eventName: string,
    handler: ChartEventHandler<TData>
  ): void {
    const key = normalizeEventSubscriptionKey(eventName);
    const set = this.listeners.get(key);
    if (!set) return;
    set.delete(handler as ChartEventHandler<any>);
    if (set.size === 0) {
      this.listeners.delete(key);
    }
  }

  /**
   * Resets transient hover tracking before a fresh render pass.
   */
  public resetHoverState(): void {
    this.activeHoverEl = null;
    this.activeHoverReg = null;
  }

  /**
   * Attaches the single delegated SVG listener set (idempotent per SVG instance).
   */
  public attach(ctx: EventEngineHostContext): void {
    this.hostCtx = ctx;
    if (this.boundSvg === ctx.svg) return;
    this.detach();
    this.boundSvg = ctx.svg;

    const directEvents: ChartEventType[] = [
      'click',
      'dblclick',
      'contextmenu',
      'focus',
      'blur',
      'mouseover',
      'mouseout',
      'mousemove',
      'pointerdown',
      'pointerup',
      'keydown'
    ];

    for (const evType of directEvents) {
      const listener = (nativeEvent: Event) => {
        this.handleDirectEvent(evType, nativeEvent);
      };
      ctx.svg.addEventListener(evType, listener, true);
      this.cleanupFns.push(() =>
        ctx.svg.removeEventListener(evType, listener, true)
      );
    }

    const onMouseEnter = (nativeEvent: Event) => {
      this.handleMouseEnter(nativeEvent);
    };
    const onMouseLeave = (nativeEvent: Event) => {
      this.handleMouseLeave(nativeEvent);
    };
    ctx.svg.addEventListener('mouseenter', onMouseEnter, true);
    ctx.svg.addEventListener('mouseleave', onMouseLeave, true);
    this.cleanupFns.push(() => {
      ctx.svg.removeEventListener('mouseenter', onMouseEnter, true);
      ctx.svg.removeEventListener('mouseleave', onMouseLeave, true);
    });
  }

  public detach(): void {
    for (const fn of this.cleanupFns) {
      fn();
    }
    this.cleanupFns = [];
    this.boundSvg = null;
    this.resetHoverState();
  }

  public resolveTarget(rawTarget: EventTarget | null): ResolvedTarget | null {
    const svg = this.boundSvg;
    if (!svg) return null;

    let node = rawTarget instanceof Element ? rawTarget : null;
    while (node && node !== svg) {
      const reg = this.registry.get(node);
      if (reg) {
        return { element: node, reg };
      }
      node = node.parentElement;
    }

    return {
      element: svg,
      reg: CANVAS_REGISTRATION
    };
  }

  private handleDirectEvent(type: ChartEventType, nativeEvent: Event): void {
    const resolved = this.resolveTarget(nativeEvent.target);
    if (!resolved) return;
    this.emit(type, resolved, nativeEvent);
  }

  private handleMouseEnter(nativeEvent: Event): void {
    const resolved = this.resolveTarget(nativeEvent.target);
    if (!resolved) return;

    if (resolved.element === this.activeHoverEl) {
      return;
    }

    if (this.activeHoverEl && this.activeHoverReg) {
      this.emit(
        'mouseleave',
        { element: this.activeHoverEl, reg: this.activeHoverReg },
        nativeEvent
      );
    }

    this.activeHoverEl = resolved.element;
    this.activeHoverReg = resolved.reg;
    this.emit('mouseenter', resolved, nativeEvent);
  }

  private handleMouseLeave(nativeEvent: Event): void {
    const svg = this.boundSvg;
    if (!svg) return;

    if (nativeEvent.target === svg) {
      if (this.activeHoverEl && this.activeHoverReg) {
        this.emit(
          'mouseleave',
          { element: this.activeHoverEl, reg: this.activeHoverReg },
          nativeEvent
        );
      } else {
        this.emit(
          'mouseleave',
          { element: svg, reg: CANVAS_REGISTRATION },
          nativeEvent
        );
      }
      this.activeHoverEl = null;
      this.activeHoverReg = null;
      return;
    }

    const resolved = this.resolveTarget(nativeEvent.target);
    if (!resolved) return;

    if (resolved.element === this.activeHoverEl) {
      this.emit('mouseleave', resolved, nativeEvent);
      this.activeHoverEl = null;
      this.activeHoverReg = null;
    } else if (this.activeHoverEl === null) {
      // Supports synthetic element.dispatchEvent(new MouseEvent('mouseleave')) in tests
      this.emit('mouseleave', resolved, nativeEvent);
    }
  }

  private buildPayload(
    type: ChartEventType,
    resolved: ResolvedTarget,
    nativeEvent: Event
  ): ChartEventPayload {
    const ctx = this.hostCtx!;
    const svgRect = ctx.svg.getBoundingClientRect();
    const margin = ctx.getMargin();

    let clientX = 0;
    let clientY = 0;
    if (
      'clientX' in nativeEvent &&
      typeof (nativeEvent as MouseEvent).clientX === 'number'
    ) {
      clientX = (nativeEvent as MouseEvent).clientX;
      clientY = (nativeEvent as MouseEvent).clientY;
    } else if (typeof resolved.element.getBoundingClientRect === 'function') {
      const r = resolved.element.getBoundingClientRect();
      clientX = r.left + r.width / 2;
      clientY = r.top + r.height / 2;
    }

    const chartX = clientX - svgRect.left - margin.left;
    const chartY = clientY - svgRect.top - margin.top;
    const isCanvas = resolved.reg.target === 'canvas';

    const payload: ChartEventPayload = {
      type,
      target: resolved.reg.target as ChartEventTargetKind,
      category: resolved.reg.category as ChartEventCategory,
      chartType: ctx.getChartType(),
      element: resolved.element,
      nativeEvent,
      clientX,
      clientY,
      chartX,
      chartY
    };

    if (!isCanvas) {
      if (resolved.reg.id !== undefined) {
        payload.targetId = resolved.reg.id;
      }
      if (resolved.reg.data !== undefined) {
        payload.data = resolved.reg.data;
      }
    }

    return payload;
  }

  private emit(
    type: ChartEventType,
    resolved: ResolvedTarget,
    nativeEvent: Event
  ): void {
    const ctx = this.hostCtx;
    if (!ctx) return;

    const payload = this.buildPayload(type, resolved, nativeEvent);
    const config = ctx.getConfig();
    const handlerKey = EVENT_TYPE_TO_HANDLER_KEY[type];
    const eventsCfg = config.events;

    // 1. Scoped config handler (e.g. config.events.axis.onClick / config.events.item.onMouseEnter)
    const scopedGroup = eventsCfg?.[payload.category];
    const scopedHandler = scopedGroup?.[handlerKey];
    if (typeof scopedHandler === 'function') {
      scopedHandler(payload);
    }

    // 2. Global config.events handler + top-level ChartConfig shorthand
    const globalHandler = eventsCfg?.[handlerKey];
    if (typeof globalHandler === 'function') {
      globalHandler(payload);
    }
    const topLevelHandler = config[handlerKey];
    if (
      typeof topLevelHandler === 'function' &&
      topLevelHandler !== globalHandler
    ) {
      topLevelHandler(payload);
    }

    // 3. Programmatic .on() listeners (exact target, category, global type, wildcard '*')
    const keysToInvoke: string[] = [`${payload.target}:${type}`];
    if (payload.category !== payload.target) {
      keysToInvoke.push(`${payload.category}:${type}`);
    }
    keysToInvoke.push(type, '*');

    for (const key of keysToInvoke) {
      const set = this.listeners.get(key);
      if (!set || set.size === 0) continue;
      for (const fn of Array.from(set)) {
        fn(payload);
      }
    }

    // 4. Composed DOM CustomEvents on the chart host element
    const eventInit = {
      bubbles: true,
      composed: true,
      detail: payload
    };
    ctx.host.dispatchEvent(
      new CustomEvent(`mc-${payload.category}-${type}`, eventInit)
    );
    ctx.host.dispatchEvent(new CustomEvent(`mc-${type}`, eventInit));
    ctx.host.dispatchEvent(new CustomEvent('mc-event', eventInit));
  }
}
