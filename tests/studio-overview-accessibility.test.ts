import { afterEach, describe, expect, it, vi } from 'vitest';
import '../src/index';
import { disposeOverviewPage, renderOverviewPage } from '../apps/studio/pages/overview';

afterEach(() => {
  document.body.replaceChildren();
  localStorage.clear();
  history.replaceState(null, '', '#/');
  vi.unstubAllGlobals();
});

describe('Studio overview navigation', () => {
  it('uses native chart links with accessible names and sequential headings', () => {
    const root = document.createElement('main');
    document.body.append(root);
    const charts = renderOverviewPage(root);
    const cards = Array.from(root.querySelectorAll<HTMLAnchorElement>('a.overview-card'));
    expect(cards).toHaveLength(10);
    for (const card of cards) {
      const heading = card.querySelector('h2.overview-card-title')!;
      expect(heading).not.toBeNull();
      expect(card.getAttribute('aria-labelledby')).toBe(heading.id);
      expect(card.getAttribute('href')).toMatch(/^#\/chart\//);
      expect(card.querySelector('.overview-preview-stage')?.getAttribute('aria-hidden')).toBe('true');
      expect(card.tabIndex).toBe(0);
    }
    expect(charts.every((chart) => chart.config.isFocusable === false)).toBe(true);
    expect(root.querySelectorAll('.overview-guide-card-title').length).toBeGreaterThan(0);
    expect(root.querySelectorAll('h3.overview-guide-card-title')).toHaveLength(0);
    expect(cards[0].getAttribute('href')).toBe('#/chart/line');
    cards[0].click();
    expect(window.location.hash).toBe('#/chart/line');
  });

  it('keeps previews unrendered until their cards approach the viewport', async () => {
    let deliverIntersections!: IntersectionObserverCallback;
    const disconnect = vi.fn();
    class PreviewObserver {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = disconnect;

      constructor(callback: IntersectionObserverCallback) {
        deliverIntersections = callback;
      }
    }
    vi.stubGlobal('IntersectionObserver', PreviewObserver);

    const root = document.createElement('main');
    document.body.append(root);
    const charts = renderOverviewPage(root);
    const [nearby, offscreen] = charts;
    const plot = (chart: typeof nearby) => chart.shadowRoot!.querySelector('.mc-chart-root')!;
    const layer = offscreen.shadowRoot!.querySelector('mc-theme-layer')!;
    layer.dispatchEvent(new CustomEvent('mc-layer-change', { bubbles: true, composed: true }));
    expect(plot(offscreen).childElementCount).toBe(0);

    const card = nearby.closest('.overview-card')!;
    deliverIntersections(
      [{ target: card, isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver
    );
    await vi.waitFor(() => expect(plot(nearby).childElementCount).toBeGreaterThan(0));
    expect(plot(offscreen).childElementCount).toBe(0);

    disposeOverviewPage(root);
    expect(disconnect).toHaveBeenCalledOnce();
  });
});
