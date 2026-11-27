import type { ChartDimensions, ViewConfig } from './types';
import { registerZoomControllerFactory } from './features';

const SVG_NS = 'http://www.w3.org/2000/svg';

export class ChartViewController {
  #transform = { k: 1, x: 0, y: 0 };
  #zoomable = false;
  #interaction: {
    scaleBy: (factor: number) => void;
    reset: () => void;
    setZoomable: (zoomable: boolean) => void;
    destroy: () => void;
  } | null = null;

  constructor(
    private readonly host: HTMLElement,
    private readonly onZoomChange: (zoomed: boolean) => void,
    private readonly onToggleZoom?: () => void
  ) {}

  get hasInteraction(): boolean {
    return this.#interaction !== null;
  }

  get zoomable(): boolean {
    return this.#zoomable;
  }

  getTransform(): { k: number; x: number; y: number } {
    return { ...this.#transform };
  }

  scaleBy(factor: number): void {
    if (!this.#zoomable) return;
    this.#interaction?.scaleBy(factor);
  }

  reset(): void {
    if (!this.#zoomable) return;
    this.#interaction?.reset();
  }

  setZoomable(zoomable: boolean): void {
    this.#zoomable = Boolean(zoomable);
    this.#interaction?.setZoomable(this.#zoomable);
  }

  destroy(): void {
    this.#interaction?.destroy();
    this.#interaction = null;
  }

  bindControls(): void {
    const controls = this.host.shadowRoot?.querySelector('.mc-view-controls');
    if (!controls || (controls as any).__mcBound) return;
    (controls as any).__mcBound = true;

    controls.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest(
        'button[data-zoom]'
      ) as HTMLButtonElement | null;
      if (!btn) return;

      const action = btn.getAttribute('data-zoom');
      if (action === 'toggle') {
        this.onToggleZoom?.();
        return;
      }
      if (!this.#interaction || !this.#zoomable || btn.disabled) return;

      if (action === 'in') {
        this.#interaction.scaleBy(1.25);
      } else if (action === 'out') {
        this.#interaction.scaleBy(0.8);
      } else if (action === 'reset') {
        this.#interaction.reset();
      }
    });

    let spaceBtn: HTMLButtonElement | null = null;
    const onKey = (e: Event, up: boolean) => {
      const ke = e as KeyboardEvent;
      if (ke.isComposing || ke.keyCode === 229) return;
      const isSpace = ke.key === ' ' || ke.key === 'Spacebar';
      if (!isSpace && (up || ke.key !== 'Enter')) return;
      const btn = (ke.target as HTMLElement | null)?.closest?.(
        'button[data-zoom]'
      ) as HTMLButtonElement | null;
      if (up && spaceBtn === btn) {
        spaceBtn = null;
        ke.preventDefault();
        return;
      }
      spaceBtn = up || !isSpace ? null : btn;
      if (btn && !btn.disabled) {
        ke.preventDefault();
        btn.click();
      }
    };
    controls.addEventListener('keydown', (e) => onKey(e, false));
    controls.addEventListener('keyup', (e) => onKey(e, true));
  }

  configure(
    svg: SVGSVGElement,
    viewportGroup: SVGGElement,
    viewConfig: ViewConfig,
    dims: ChartDimensions
  ): void {
    this.destroy();

    const container = this.host.shadowRoot?.querySelector(
      '.mc-chart-container'
    ) as HTMLDivElement | null;
    const existingSlider = container?.querySelector('.mc-view-slider');
    existingSlider?.remove();
    svg.querySelector('.mc-view-brush')?.remove();

    this.#zoomable = Boolean(viewConfig.zoomable);

    if (!viewConfig.enabled && !viewConfig.showControls) {
      this.#transform = { k: 1, x: 0, y: 0 };
      viewportGroup.removeAttribute('transform');
      this.onZoomChange(false);
      return;
    }

    const getMinK = (): number =>
      this.#zoomable || viewConfig.brush || viewConfig.slider
        ? viewConfig.minZoom
        : 1;
    const getMaxK = (): number =>
      this.#zoomable || viewConfig.brush || viewConfig.slider
        ? viewConfig.maxZoom
        : 1;

    const clamp = (value: number, lo: number, hi: number): number =>
      Math.max(Math.min(lo, hi), Math.min(Math.max(lo, hi), value));

    let sliderWindowEl: HTMLDivElement | null = null;
    let sliderEl: HTMLDivElement | null = null;
    let leftHandleEl: HTMLButtonElement | null = null;
    let rightHandleEl: HTMLButtonElement | null = null;

    const syncSliderDom = (startPct: number, endPct: number): void => {
      if (!sliderWindowEl || !sliderEl) return;
      const s = clamp(startPct, 0, 95);
      const e = clamp(endPct, s + 5, 100);
      sliderWindowEl.style.left = `${s}%`;
      sliderWindowEl.style.width = `${e - s}%`;
      sliderEl.setAttribute('data-start', String(Math.round(s)));
      sliderEl.setAttribute('data-end', String(Math.round(e)));
    };

    const syncSliderDisabledState = (): void => {
      if (!sliderEl) return;
      sliderEl.setAttribute('aria-disabled', String(!this.#zoomable));
      if (leftHandleEl) leftHandleEl.disabled = !this.#zoomable;
      if (rightHandleEl) rightHandleEl.disabled = !this.#zoomable;
    };

    const applyTransform = (nextK: number, nextX: number, nextY: number): void => {
      const k = clamp(nextK, getMinK(), getMaxK());
      const rawX = viewConfig.direction === 'y' ? 0 : nextX;
      const rawY = viewConfig.direction === 'x' ? 0 : nextY;
      const tx =
        viewConfig.direction === 'y'
          ? 0
          : clamp(rawX, dims.width * (1 - 1.5 * k), dims.width * 0.5 * k);
      const ty =
        viewConfig.direction === 'x'
          ? 0
          : clamp(rawY, dims.height * (1 - 1.5 * k), dims.height * 0.5 * k);

      this.#transform = { k, x: tx, y: ty };
      viewportGroup.setAttribute(
        'transform',
        `translate(${tx}, ${ty}) scale(${k})`
      );
      this.onZoomChange(k !== 1 || tx !== 0 || ty !== 0);

      const spanPct = clamp(100 / k, 5, 100);
      const startPct = clamp(
        (-tx / Math.max(1, dims.width * k)) * 100,
        0,
        100 - spanPct
      );
      const endPct = clamp(startPct + spanPct, startPct + 5, 100);
      syncSliderDom(startPct, endPct);

      this.host.dispatchEvent(
        new CustomEvent('mc-zoom', {
          bubbles: true,
          composed: true,
          detail: { k, x: tx, y: ty }
        })
      );
    };

    const applyPercentRange = (startPct: number, endPct: number): void => {
      const s = clamp(startPct, 0, 95);
      const e = clamp(endPct, s + 5, 100);
      const span = e - s;
      const nextK = clamp(100 / span, getMinK(), getMaxK());
      const nextX =
        viewConfig.direction === 'y'
          ? 0
          : -(s / 100) * dims.width * nextK;
      const nextY =
        viewConfig.direction === 'y'
          ? -(s / 100) * dims.height * nextK
          : 0;
      applyTransform(nextK, nextX, nextY);
    };

    let sliderDragMode: 'window' | 'start' | 'end' | null = null;

    if (viewConfig.slider && container) {
      sliderEl = document.createElement('div');
      sliderEl.className = 'mc-view-slider';
      sliderEl.setAttribute('part', 'datazoom-slider');
      sliderEl.setAttribute('role', 'group');
      sliderEl.setAttribute('aria-label', 'Chart data zoom range slider');
      sliderEl.style.cssText =
        'height:18px;border-radius:6px;background:rgba(148,163,184,0.16);border:1px solid rgba(148,163,184,0.3);z-index:5;user-select:none;touch-action:none;';

      sliderWindowEl = document.createElement('div');
      sliderWindowEl.className = 'mc-view-slider-window';
      sliderWindowEl.style.cssText =
        'position:absolute;top:0;bottom:0;left:0%;width:100%;background:rgba(56,189,248,0.24);border-left:3px solid #0284c7;border-right:3px solid #0284c7;border-radius:4px;cursor:grab;box-sizing:border-box;';

      const leftHandle = document.createElement('button');
      leftHandle.type = 'button';
      leftHandle.className = 'mc-view-slider-handle mc-view-slider-handle--start';
      leftHandle.setAttribute('data-handle', 'start');
      leftHandle.setAttribute('aria-label', 'Zoom range start');
      leftHandle.style.cssText =
        'position:absolute;left:-5px;top:2px;bottom:2px;width:8px;padding:0;border:none;border-radius:3px;background:#0284c7;cursor:ew-resize;';
      leftHandleEl = leftHandle;

      const rightHandle = document.createElement('button');
      rightHandle.type = 'button';
      rightHandle.className = 'mc-view-slider-handle mc-view-slider-handle--end';
      rightHandle.setAttribute('data-handle', 'end');
      rightHandle.setAttribute('aria-label', 'Zoom range end');
      rightHandle.style.cssText =
        'position:absolute;right:-5px;top:2px;bottom:2px;width:8px;padding:0;border:none;border-radius:3px;background:#0284c7;cursor:ew-resize;';
      rightHandleEl = rightHandle;

      sliderWindowEl.append(leftHandle, rightHandle);
      sliderEl.appendChild(sliderWindowEl);
      container.appendChild(sliderEl);
      syncSliderDisabledState();

      let dragStartX = 0;
      let origStart = viewConfig.start ?? 0;
      let origEnd = viewConfig.end ?? 100;

      sliderEl.addEventListener('pointerdown', (e: PointerEvent) => {
        if (!this.#zoomable) return;
        const target = e.target as HTMLElement;
        const handle = target.getAttribute('data-handle');
        sliderDragMode =
          handle === 'start'
            ? 'start'
            : handle === 'end'
            ? 'end'
            : 'window';
        dragStartX = e.clientX;
        origStart = Number(sliderEl?.getAttribute('data-start') ?? 0);
        origEnd = Number(sliderEl?.getAttribute('data-end') ?? 100);
        sliderEl?.setPointerCapture?.(e.pointerId);
        e.stopPropagation();
      });

      sliderEl.addEventListener('pointermove', (e: PointerEvent) => {
        if (!this.#zoomable || !sliderDragMode || !sliderEl) return;
        const trackW = Math.max(40, sliderEl.clientWidth || dims.innerWidth);
        const deltaPct = ((e.clientX - dragStartX) / trackW) * 100;
        if (sliderDragMode === 'start') {
          applyPercentRange(clamp(origStart + deltaPct, 0, origEnd - 5), origEnd);
        } else if (sliderDragMode === 'end') {
          applyPercentRange(origStart, clamp(origEnd + deltaPct, origStart + 5, 100));
        } else {
          const span = origEnd - origStart;
          const nextS = clamp(origStart + deltaPct, 0, 100 - span);
          applyPercentRange(nextS, nextS + span);
        }
      });

      const endSliderDrag = () => {
        sliderDragMode = null;
      };
      sliderEl.addEventListener('pointerup', endSliderDrag);
      sliderEl.addEventListener('pointercancel', endSliderDrag);
    }

    const scaleBy = (
      factor: number,
      cx = dims.width / 2,
      cy = dims.height / 2
    ): void => {
      if (!this.#zoomable) return;
      const prev = this.#transform;
      const nextK = clamp(prev.k * factor, getMinK(), getMaxK());
      const ratio = nextK / prev.k;
      const nextX = cx - (cx - prev.x) * ratio;
      const nextY = cy - (cy - prev.y) * ratio;
      applyTransform(nextK, nextX, nextY);
    };

    const toSvgCoords = (event: MouseEvent, fallbackX = event.clientX, fallbackY = event.clientY) => {
      const transform = svg.clientWidth > 0 ? svg.getScreenCTM() : null;
      if (transform) {
        return new DOMPoint(event.clientX, event.clientY).matrixTransform(transform.inverse());
      }
      const rect = svg.getBoundingClientRect();
      return {
        x: rect.width > 0 ? event.clientX - rect.left : fallbackX,
        y: rect.height > 0 ? event.clientY - rect.top : fallbackY
      };
    };

    const onWheel = (e: WheelEvent): void => {
      if (!this.#zoomable) return;
      e.preventDefault();
      const { x, y } = toSvgCoords(e, dims.width / 2, dims.height / 2);
      const deltaScale = e.deltaMode === 1 ? 0.05 : e.deltaMode ? 1 : 0.002;
      scaleBy(Math.pow(2, -e.deltaY * deltaScale), x, y);
    };

    let pointerDown = false;
    let dragging = false;
    let isBrushing = false;
    let brushRectEl: SVGRectElement | null = null;
    let capturedPointerId: number | null = null;
    let startX = 0;
    let startY = 0;
    let origX = 0;
    let origY = 0;

    const onPointerDown = (e: PointerEvent): void => {
      if (e.button !== 0) return;
      const wantBrush =
        this.#zoomable && (Boolean(viewConfig.brush) || e.shiftKey);
      if (!wantBrush && !viewConfig.pannable) return;
      pointerDown = true;
      dragging = false;
      isBrushing = wantBrush;
      capturedPointerId = null;
      const { x, y } = toSvgCoords(e);
      startX = x;
      startY = y;
      origX = this.#transform.x;
      origY = this.#transform.y;
    };

    const onPointerMove = (e: PointerEvent): void => {
      if (!pointerDown) return;
      if (isBrushing) {
        if (!this.#zoomable) return;
        const pt = toSvgCoords(e);
        const dx = pt.x - startX;
        const dy = pt.y - startY;
        if (!dragging) {
          if (Math.hypot(dx, dy) < 4) return;
          dragging = true;
          capturedPointerId = e.pointerId;
          svg.setPointerCapture?.(e.pointerId);
          brushRectEl = document.createElementNS(SVG_NS, 'rect');
          brushRectEl.setAttribute('class', 'mc-view-brush');
          brushRectEl.setAttribute('fill', 'rgba(56, 189, 248, 0.18)');
          brushRectEl.setAttribute('stroke', '#0284c7');
          brushRectEl.setAttribute('stroke-width', '1.5');
          brushRectEl.setAttribute('stroke-dasharray', '4 2');
          brushRectEl.setAttribute('pointer-events', 'none');
          svg.appendChild(brushRectEl);
        }
        if (brushRectEl) {
          const bx =
            viewConfig.direction === 'y'
              ? dims.margin.left
              : Math.min(startX, pt.x);
          const by =
            viewConfig.direction === 'x'
              ? dims.margin.top
              : Math.min(startY, pt.y);
          const bw =
            viewConfig.direction === 'y'
              ? dims.innerWidth
              : Math.max(2, Math.abs(dx));
          const bh =
            viewConfig.direction === 'x'
              ? dims.innerHeight
              : Math.max(2, Math.abs(dy));
          brushRectEl.setAttribute('x', String(bx));
          brushRectEl.setAttribute('y', String(by));
          brushRectEl.setAttribute('width', String(bw));
          brushRectEl.setAttribute('height', String(bh));
        }
        return;
      }

      const { x, y } = toSvgCoords(e);
      const dx = x - startX;
      const dy = y - startY;
      if (!dragging) {
        if (Math.hypot(dx, dy) < 4) return;
        dragging = true;
        capturedPointerId = e.pointerId;
        svg.setPointerCapture?.(e.pointerId);
      }
      applyTransform(
        this.#transform.k,
        origX + dx,
        origY + dy
      );
    };

    const onPointerEnd = (e: PointerEvent): void => {
      if (!pointerDown) return;
      if (isBrushing && dragging && this.#zoomable) {
        const pt = toSvgCoords(e);
        const x0 = Math.min(startX, pt.x);
        const x1 = Math.max(startX, pt.x);
        const y0 = Math.min(startY, pt.y);
        const y1 = Math.max(startY, pt.y);
        brushRectEl?.remove();
        brushRectEl = null;

        const spanW = Math.max(12, x1 - x0);
        const startPct = clamp((x0 / Math.max(1, dims.width)) * 100, 0, 95);
        const endPct = clamp(
          ((x0 + spanW) / Math.max(1, dims.width)) * 100,
          startPct + 5,
          100
        );
        applyPercentRange(startPct, endPct);
        this.host.dispatchEvent(
          new CustomEvent('mc-brush', {
            bubbles: true,
            composed: true,
            detail: {
              x0,
              y0,
              x1,
              y1,
              start: Math.round(startPct * 10) / 10,
              end: Math.round(endPct * 10) / 10,
              ...this.#transform
            }
          })
        );
      } else if (brushRectEl) {
        brushRectEl.remove();
        brushRectEl = null;
      }
      pointerDown = false;
      dragging = false;
      isBrushing = false;
      if (capturedPointerId !== null) {
        svg.releasePointerCapture?.(capturedPointerId);
        capturedPointerId = null;
      }
    };

    svg.addEventListener('wheel', onWheel, { passive: false });
    svg.addEventListener('pointerdown', onPointerDown);
    svg.addEventListener('pointermove', onPointerMove);
    svg.addEventListener('pointerup', onPointerEnd);
    svg.addEventListener('pointercancel', onPointerEnd);

    this.#interaction = {
      scaleBy: (factor: number) => scaleBy(factor),
      reset: () => {
        if (!this.#zoomable) return;
        applyTransform(1, 0, 0);
      },
      setZoomable: (nextZoomable: boolean) => {
        viewConfig.zoomable = nextZoomable;
        syncSliderDisabledState();
        if (!nextZoomable) {
          sliderDragMode = null;
          if (isBrushing) {
            brushRectEl?.remove();
            brushRectEl = null;
            isBrushing = false;
            pointerDown = false;
            dragging = false;
          }
        }
      },
      destroy: () => {
        svg.removeEventListener('wheel', onWheel);
        svg.removeEventListener('pointerdown', onPointerDown);
        svg.removeEventListener('pointermove', onPointerMove);
        svg.removeEventListener('pointerup', onPointerEnd);
        svg.removeEventListener('pointercancel', onPointerEnd);
        sliderEl?.remove();
        brushRectEl?.remove();
      }
    };

    if (
      (viewConfig.start !== undefined && viewConfig.start > 0) ||
      (viewConfig.end !== undefined && viewConfig.end < 100)
    ) {
      applyPercentRange(viewConfig.start ?? 0, viewConfig.end ?? 100);
    } else if (
      viewConfig.initialZoom !== 1 ||
      viewConfig.initialPanX !== 0 ||
      viewConfig.initialPanY !== 0
    ) {
      applyTransform(
        viewConfig.initialZoom,
        viewConfig.initialPanX,
        viewConfig.initialPanY
      );
    } else {
      this.#transform = { k: 1, x: 0, y: 0 };
      viewportGroup.removeAttribute('transform');
      syncSliderDom(0, 100);
      this.onZoomChange(false);
    }
  }
}

registerZoomControllerFactory(
  (host, onZoomChange, onToggleZoom) =>
    new ChartViewController(host, onZoomChange, onToggleZoom)
);
