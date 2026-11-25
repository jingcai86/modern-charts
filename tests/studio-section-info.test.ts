import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  renderSectionInfoTooltip,
  wireSectionInfoTooltips,
} from '../apps/studio/pages/chart-detail/section-info';

describe('Studio section info tooltips', () => {
  afterEach(() => {
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  it('keeps untrusted IDs and labels inside all attributes while preserving trusted help markup', () => {
    const id = `info-'"\t data-injected="id" onclick="alert(1)"><img data-injected="id" src=x onerror="alert(1)">\\ &quot; &#39; &amp; < > =`;
    const label = `Help '" autofocus onfocus="alert(2)"><script data-injected="label">alert(2)</script> &quot; &#39; &amp; < > =`;
    const container = document.createElement('div');
    container.innerHTML = renderSectionInfoTooltip(
      id,
      label,
      '<p class="help-copy">Use <code>chart.config</code> &amp; inspect values.</p>'
    );
    document.body.appendChild(container);

    expect(container.children).toHaveLength(2);
    const button = container.querySelector<HTMLButtonElement>('.section-info-btn')!;
    const popover = container.querySelector<HTMLElement>('.section-info-popover')!;
    expect(button).not.toBeNull();
    expect(popover).not.toBeNull();
    for (const attribute of ['interestfor', 'popovertarget', 'data-info-target', 'aria-controls']) {
      expect(button.getAttribute(attribute), attribute).toBe(id);
    }
    expect(button.dataset.infoTarget).toBe(id);
    expect(button.getAttribute('aria-label')).toBe(label);
    expect(popover.getAttribute('id')).toBe(id);
    expect(
      container.querySelector('img, script, [data-injected], [onclick], [onerror], [onfocus], [autofocus]')
    ).toBeNull();
    expect(popover.querySelector('.help-copy')?.textContent).toBe(
      'Use chart.config & inspect values.'
    );
    expect(popover.querySelector('.help-copy > code')?.textContent).toBe('chart.config');
  });

  it.each([
    { placement: 'below the icon', x: 74, y: 136, left: '74px', top: '166px' },
    {
      placement: 'above the icon and within the right edge',
      x: 294, y: 270, left: '112px', top: '202px'
    }
  ])(
    'places a hovered tooltip $placement when CSS anchoring is supported',
    ({ x, y, left, top }) => {
      vi.spyOn(CSS, 'supports').mockReturnValue(true);
      vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(320);
      vi.spyOn(document.documentElement, 'clientHeight', 'get').mockReturnValue(300);

      const container = document.createElement('div');
      container.innerHTML = renderSectionInfoTooltip('test-info', 'Help', 'Section help.');
      document.body.appendChild(container);
      const button = container.querySelector<HTMLButtonElement>('.section-info-btn')!;
      const popover = container.querySelector<HTMLElement>('.section-info-popover')!;
      vi.spyOn(button, 'getBoundingClientRect').mockReturnValue(new DOMRect(x, y, 22, 22));
      vi.spyOn(popover, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 200, 60));
      wireSectionInfoTooltips(container);

      button.dispatchEvent(new MouseEvent('mouseenter'));

      expect(popover.style.left).toBe(left);
      expect(popover.style.top).toBe(top);
    }
  );

  it('synchronizes only the matching trigger when a popover ID contains quotes and backslashes', () => {
    const id = `section-"quoted'\\path`;
    const container = document.createElement('div');
    container.innerHTML = renderSectionInfoTooltip(
      'ordinary-info',
      'Ordinary help',
      '<p>Ordinary help.</p>'
    );
    document.body.appendChild(container);
    wireSectionInfoTooltips(container);
    // The document-level toggle listener must also handle subsequently added pairs.
    container.insertAdjacentHTML(
      'beforeend',
      renderSectionInfoTooltip(id, 'Quoted ID help', '<p>Quoted ID help.</p>')
    );

    const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>('.section-info-btn'));
    const popovers = Array.from(container.querySelectorAll<HTMLElement>('.section-info-popover'));
    const matchingButton = buttons.find((button) => button.dataset.infoTarget === id)!;
    const otherButton = buttons.find((button) => button.dataset.infoTarget === 'ordinary-info')!;
    const matchingPopover = popovers.find((popover) => popover.id === id)!;
    const otherPopover = popovers.find((popover) => popover.id === 'ordinary-info')!;

    const open = new Event('toggle');
    Object.defineProperty(open, 'newState', { value: 'open' });
    matchingPopover.dispatchEvent(open);

    expect(matchingButton.getAttribute('aria-expanded')).toBe('true');
    expect(matchingButton.classList.contains('interest-source')).toBe(true);
    expect(matchingPopover.classList.contains('is-open')).toBe(true);
    expect(otherButton.getAttribute('aria-expanded')).toBe('false');
    expect(otherButton.classList.contains('interest-source')).toBe(false);
    expect(otherPopover.classList.contains('is-open')).toBe(false);

    const close = new Event('toggle');
    Object.defineProperty(close, 'newState', { value: 'closed' });
    matchingPopover.dispatchEvent(close);

    expect(matchingButton.getAttribute('aria-expanded')).toBe('false');
    expect(matchingButton.classList.contains('interest-source')).toBe(false);
    expect(matchingPopover.classList.contains('is-open')).toBe(false);
    expect(otherButton.getAttribute('aria-expanded')).toBe('false');
  });
});
