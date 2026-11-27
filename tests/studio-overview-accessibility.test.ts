import { afterEach, describe, expect, it, vi } from 'vitest';
import '../src/index';
import type { MCBaseChart } from '../src/index';
import { GUIDES_CATALOG } from '../apps/studio/guides/types';
import { createGuideNavigationGroups } from '../apps/studio/guides/navigation';
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
    expect(cards[0].getAttribute('href')).toBe('#/chart/line');
    cards[0].click();
    expect(window.location.hash).toBe('#/chart/line');
  });

  it('groups every guide and resource under a labeled topic heading', async () => {
    localStorage.setItem('modern-charts-studio-home-tab', 'guides');
    const root = document.createElement('main');
    document.body.append(root);
    renderOverviewPage(root);
    const panel = root.querySelector('[role="tabpanel"][aria-labelledby="overview-tab-guides"]')!;
    const groups = Array.from(panel.querySelectorAll<HTMLDetailsElement>('details.overview-guide-group'));
    expect(groups.map((group) => group.querySelector('summary')?.textContent)).toEqual([
      'Integrations & Extensions', 'Colors, Patterns & Gradients', 'Labels & Layout',
      'Data & Interaction', 'Optional Features', 'Accessibility & Localization', 'Resources'
    ]);
    expect(groups.filter((group) => group.open)).toEqual(groups.slice(0, 4));

    groups[4].querySelector('summary')!.click();
    expect(groups.filter((group) => group.open)).toEqual(groups.slice(0, 5));
    groups[0].querySelector('summary')!.click();
    expect(groups.filter((group) => group.open)).toEqual(groups.slice(1, 5));
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    // Re-rendering the overview page restores the user's opened/closed guide groups from localStorage
    renderOverviewPage(root);
    const restoredPanel = root.querySelector('[role="tabpanel"][aria-labelledby="overview-tab-guides"]')!;
    const restoredGroups = Array.from(
      restoredPanel.querySelectorAll<HTMLDetailsElement>('details.overview-guide-group')
    );
    expect(restoredGroups.filter((group) => group.open)).toEqual(restoredGroups.slice(1, 5));

    const urls = restoredGroups.flatMap((group) => {
      const heading = group.querySelector('summary h2.overview-guide-group-title')!;
      expect(heading.id).toBeTruthy();
      expect(heading.textContent?.trim()).toBeTruthy();
      expect(group.getAttribute('aria-labelledby')).toBe(heading.id);
      const links = Array.from(group.querySelectorAll<HTMLAnchorElement>('.overview-guides-grid a.overview-guide-card'));
      expect(links.length).toBeGreaterThan(0);
      for (const link of links) {
        expect(link.querySelector('h3.overview-guide-card-title')?.textContent?.trim()).toBeTruthy();
      }
      return links.map((link) => link.getAttribute('href'));
    });
    expect(restoredPanel.querySelectorAll('a.overview-guide-card')).toHaveLength(urls.length);
    expect(urls.sort()).toEqual([...GUIDES_CATALOG.map(({ id }) => `#/guide/${id}`), './llms.txt'].sort());

    const topicFor = (id: string) => restoredPanel.querySelector(`a[href="#/guide/${id}"]`)?.closest('.overview-guide-group');
    const optionalFeatures = topicFor('bootstrapping');
    expect(optionalFeatures).toBeInstanceOf(HTMLElement);
    expect(topicFor('view-zoom')).toBe(optionalFeatures);
    expect(topicFor('csv-export')).toBe(optionalFeatures);

    const dataAndInteraction = topicFor('dynamic-updates');
    expect(dataAndInteraction).toBeInstanceOf(HTMLElement);
    expect(topicFor('chart-state')).toBe(dataAndInteraction);

    const colors = topicFor('themes');
    expect(colors).toBeInstanceOf(HTMLElement);
    expect(topicFor('patterns')).toBe(colors);
    expect(colors).not.toBe(optionalFeatures);

    const aiContext = restoredPanel.querySelector<HTMLAnchorElement>('a[href="./llms.txt"]')!;
    expect(aiContext.target).toBe('_blank');
    expect(aiContext.rel.split(' ')).toEqual(expect.arrayContaining(['noopener', 'noreferrer']));

    const navHost = document.createElement('ul');
    navHost.appendChild(createGuideNavigationGroups());
    document.body.appendChild(navHost);
    const navDetails = Array.from(navHost.querySelectorAll<HTMLDetailsElement>('details.nav-dropdown-group'));
    expect(navDetails.filter((d) => d.open)).toEqual(navDetails.slice(1, 5));
    navDetails[0].querySelector('summary')!.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(navDetails[0].open).toBe(true);
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
