import { afterEach, describe, expect, it } from 'vitest';
import '../src/index';
import { renderOverviewPage } from '../apps/studio/pages/overview';

afterEach(() => {
  document.body.replaceChildren();
  localStorage.clear();
  history.replaceState(null, '', '#/');
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
});
