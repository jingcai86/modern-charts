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
