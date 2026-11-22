// Polyfill ResizeObserver if not provided by test environment
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    private callback: ResizeObserverCallback;
    constructor(callback: ResizeObserverCallback) {
      this.callback = callback;
    }
    observe(_target: Element): void {}
    unobserve(_target: Element): void {}
    disconnect(): void {}
  };
}

// Polyfill 2D canvas context for @chenglou/pretext in headless environments (e.g. Linux CI / happy-dom)
function createMockCanvasContext() {
  return {
    font: '12px sans-serif',
    letterSpacing: '0px',
    lang: 'en',
    measureText(text: string) {
      const len = typeof text === 'string' ? text.length : 0;
      return {
        width: len * 7.5,
        actualBoundingBoxAscent: 10,
        actualBoundingBoxDescent: 3,
        fontBoundingBoxAscent: 12,
        fontBoundingBoxDescent: 4
      };
    }
  };
}

if (typeof HTMLCanvasElement !== 'undefined') {
  const origGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, contextId: string, ...args: any[]) {
    if (contextId === '2d') {
      return createMockCanvasContext() as any;
    }
    return origGetContext ? origGetContext.apply(this, [contextId, ...args] as any) : null;
  } as any;
}

// Polyfill OffscreenCanvas if missing or getContext('2d') returns null
try {
  const testCanvas = new (globalThis as any).OffscreenCanvas(1, 1);
  if (!testCanvas.getContext('2d')) {
    throw new Error('No 2d context');
  }
} catch {
  (globalThis as any).OffscreenCanvas = class OffscreenCanvas {
    width: number;
    height: number;
    constructor(w = 1, h = 1) {
      this.width = w;
      this.height = h;
    }
    getContext(contextId: string) {
      if (contextId === '2d') {
        return createMockCanvasContext();
      }
      return null;
    }
  };
}
