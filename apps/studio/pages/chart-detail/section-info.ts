import { escapeHtml } from '../../guides/shared';

let globalListenersWired = false;
let supportsHintPopover: boolean | null = null;

function escapeHtmlAttribute(value: string): string {
  return escapeHtml(value).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function checkHintPopoverSupport(): boolean {
  if (supportsHintPopover !== null) return supportsHintPopover;
  if (typeof document === 'undefined') return false;
  const probe = document.createElement('div');
  probe.setAttribute('popover', 'hint');
  supportsHintPopover = (probe as any).popover === 'hint';
  return supportsHintPopover;
}

function positionInfoPopover(trigger: HTMLElement, popover: HTMLElement): void {
  if (
    typeof CSS !== 'undefined' &&
    typeof CSS.supports === 'function' &&
    CSS.supports('position-area', 'block-end')
  ) {
    return;
  }
  const rect = trigger.getBoundingClientRect();
  const popRect = popover.getBoundingClientRect();
  const popW = popRect.width || 280;
  const popH = popRect.height || 72;
  const gap = 8;

  let top = rect.bottom + gap;
  if (top + popH > window.innerHeight - gap && rect.top - gap - popH > gap) {
    top = rect.top - gap - popH;
  }
  const maxLeft = Math.max(gap, window.innerWidth - popW - gap);
  const left = Math.max(gap, Math.min(rect.left, maxLeft));

  popover.style.top = `${Math.round(top)}px`;
  popover.style.left = `${Math.round(left)}px`;
}

function ensureGlobalInfoListeners(): void {
  if (globalListenersWired || typeof document === 'undefined') return;
  globalListenersWired = true;

  if (!checkHintPopoverSupport()) {
    document.addEventListener(
      'beforetoggle',
      (event) => {
        const target = event.target as HTMLElement | null;
        if (!target || !target.classList?.contains('section-info-popover')) return;
        const newState = (event as any).newState;
        if (newState === 'open' && target.getAttribute('popover') === 'hint') {
          try {
            (target as any).popover = 'auto';
          } catch {
            target.setAttribute('popover', 'auto');
          }
        }
      },
      true
    );
  }

  document.addEventListener(
    'toggle',
    (event) => {
      const target = event.target as HTMLElement | null;
      if (!target || !target.id || !target.classList?.contains('section-info-popover')) {
        return;
      }
      const isOpen = (event as any).newState === 'open';
      target.classList.toggle('is-open', isOpen);
      const triggers = document.querySelectorAll<HTMLElement>(
        '.section-info-btn[data-info-target]'
      );
      triggers.forEach((btn) => {
        if (btn.dataset.infoTarget !== target.id) return;
        btn.setAttribute('aria-expanded', String(isOpen));
        btn.classList.toggle('interest-source', isOpen);
        if (isOpen) {
          positionInfoPopover(btn, target);
        }
      });
    },
    true
  );
}

/**
 * Renders an info icon button (`ⓘ`) and its paired `popover="hint"` tooltip
 * to sit beside a chart page section title.
 * `contentHtml` is trusted HTML; callers must escape any dynamic text within it.
 */
export function renderSectionInfoTooltip(
  id: string,
  ariaLabel: string,
  contentHtml: string
): string {
  const safeId = escapeHtmlAttribute(id);
  const safeLabel = escapeHtmlAttribute(ariaLabel);
  return `
    <button
      type="button"
      class="section-info-btn"
      interestfor="${safeId}"
      popovertarget="${safeId}"
      popovertargetaction="show"
      data-info-target="${safeId}"
      aria-label="${safeLabel}"
      aria-expanded="false"
      aria-controls="${safeId}"
    >
      <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.5"/>
        <path d="M8 7.2V11.2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <circle cx="8" cy="4.8" r="0.9" fill="currentColor"/>
      </svg>
    </button>
    <div
      id="${safeId}"
      class="section-info-popover"
      popover="hint"
      role="tooltip"
    >
      ${contentHtml}
    </div>
  `;
}

/**
 * Wires hover, focus, click, and Escape dismissal for `.section-info-btn` triggers
 * inside `container` so tooltips show on hover/focus across all browsers.
 */
export function wireSectionInfoTooltips(container: HTMLElement): void {
  ensureGlobalInfoListeners();

  const buttons = container.querySelectorAll<HTMLButtonElement>('.section-info-btn');
  buttons.forEach((btn) => {
    if (btn.dataset.infoWired === 'true') return;
    btn.dataset.infoWired = 'true';

    const targetId = btn.dataset.infoTarget;
    if (!targetId) return;
    const popover = container.querySelector<HTMLElement>(`#${CSS.escape(targetId)}`);
    if (!popover) return;

    let hideTimer: ReturnType<typeof setTimeout> | null = null;

    const clearHideTimer = () => {
      if (hideTimer !== null) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
    };

    const showInfo = () => {
      clearHideTimer();
      // Close any other open section info popovers
      document
        .querySelectorAll<HTMLElement>('.section-info-popover.is-open')
        .forEach((other) => {
          if (other !== popover) {
            other.classList.remove('is-open');
            try {
              if (typeof other.hidePopover === 'function') other.hidePopover();
            } catch {
              // ignore if already hidden
            }
          }
        });
      document
        .querySelectorAll<HTMLElement>('.section-info-btn[aria-expanded="true"]')
        .forEach((otherBtn) => {
          if (otherBtn !== btn) {
            otherBtn.setAttribute('aria-expanded', 'false');
            otherBtn.classList.remove('interest-source');
          }
        });

      popover.classList.add('is-open');
      btn.setAttribute('aria-expanded', 'true');
      btn.classList.add('interest-source');
      try {
        if (typeof popover.showPopover === 'function') {
          popover.showPopover();
        }
      } catch {
        // ignore if already open or unsupported in test DOM
      }
      positionInfoPopover(btn, popover);
    };

    const hideInfoImmediate = () => {
      clearHideTimer();
      popover.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
      btn.classList.remove('interest-source');
      try {
        if (typeof popover.hidePopover === 'function') {
          popover.hidePopover();
        }
      } catch {
        // ignore if already closed
      }
    };

    const scheduleHideInfo = () => {
      clearHideTimer();
      hideTimer = setTimeout(hideInfoImmediate, 100);
    };

    btn.addEventListener('mouseenter', showInfo);
    btn.addEventListener('mouseleave', scheduleHideInfo);
    btn.addEventListener('focus', showInfo);
    btn.addEventListener('blur', scheduleHideInfo);
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      showInfo();
    });
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        hideInfoImmediate();
      }
    });

    popover.addEventListener('mouseenter', clearHideTimer);
    popover.addEventListener('mouseleave', scheduleHideInfo);
  });
}
