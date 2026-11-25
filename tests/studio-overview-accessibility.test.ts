import { afterEach, describe, expect, it, vi } from 'vitest';
import '../src/index';
import type { MCBaseChart } from '../src/index';
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
    renderOverviewPage(root);
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
    expect(root.querySelectorAll('.overview-guide-card-title').length).toBeGreaterThan(0);
    expect(root.querySelectorAll('h3.overview-guide-card-title')).toHaveLength(0);
    expect(cards[0].getAttribute('href')).toBe('#/chart/line');
    cards[0].click();
    expect(window.location.hash).toBe('#/chart/line');
  });

  it('mounts previews only as their cards approach the viewport', async () => {
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
    const [line, bar] = Array.from(root.querySelectorAll('.overview-card'));
    const preview = (card: Element) =>
      card.querySelector<MCBaseChart<any>>('.overview-preview-stage > *');
    const entry = (target: Element, isIntersecting: boolean) =>
      ({ target, isIntersecting }) as IntersectionObserverEntry;
    const observer = {} as IntersectionObserver;

    expect(charts).toHaveLength(0);
    expect(preview(line)).toBeNull();
    expect(preview(bar)).toBeNull();

    deliverIntersections([entry(line, true), entry(bar, true)], observer);
    deliverIntersections([entry(bar, false)], observer);
    await vi.waitFor(() => expect(charts).toHaveLength(1));
    expect(charts[0]).toBe(preview(line));
    expect(charts[0].config.isFocusable).toBe(false);
    expect(charts[0].shadowRoot!.querySelector('.mc-line-path')).not.toBeNull();
    expect(preview(bar)).toBeNull();

    deliverIntersections([entry(bar, true)], observer);
    await vi.waitFor(() => expect(charts).toHaveLength(2));
    expect(charts[1]).toBe(preview(bar));
    expect(charts[1].shadowRoot!.querySelector('.mc-bar-rect')).not.toBeNull();

    disposeOverviewPage(root);
    expect(disconnect).toHaveBeenCalledOnce();
  });

  it('loads the previews on the Chart Types tab when intersection observation is unavailable', async () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    localStorage.setItem('modern-charts-studio-home-tab', 'guides');
    const root = document.createElement('main');
    document.body.append(root);
    const charts = renderOverviewPage(root);

    expect(charts).toHaveLength(0);
    root.querySelector<HTMLButtonElement>('#overview-tab-examples')!.click();
    await vi.waitFor(() => expect(charts).toHaveLength(10));
    disposeOverviewPage(root);
  });
});
