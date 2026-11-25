import { escapeHtml } from '../../utils/html';

let globalListenersWired = false;
let supportsHintPopover: boolean | null = null;
let openInfoId: string | null = null;
let positionFrame: number | null = null;

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

function positionInfoPopover(
  trigger: HTMLElement,
  popover: HTMLElement,
  rect = trigger.getBoundingClientRect()
): void {
  const { width, height } = popover.getBoundingClientRect();
  const viewport = trigger.ownerDocument.documentElement;
  const viewportWidth = viewport.clientWidth || window.innerWidth;
  const viewportHeight = viewport.clientHeight || window.innerHeight;
  const gap = 8;
  const below = viewportHeight - rect.bottom;
  const above = rect.top;
  const preferredTop =
    below < height + gap * 2 && above > below
      ? rect.top - gap - height
      : rect.bottom + gap;
  const top = Math.max(gap, Math.min(preferredTop, viewportHeight - height - gap));
  const left = Math.max(gap, Math.min(rect.left, viewportWidth - width - gap));

  popover.style.top = `${Math.round(top)}px`;
  popover.style.left = `${Math.round(left)}px`;
}

function getInfoTrigger(popover: HTMLElement): HTMLButtonElement | null {
  const trigger = popover.previousElementSibling;
  return trigger instanceof HTMLButtonElement && trigger.dataset.infoTarget === popover.id
    ? trigger
    : null;
}

function getOpenInfoPopover(): HTMLElement | null {
  const popover = openInfoId ? document.getElementById(openInfoId) : null;
  if (popover?.classList.contains('is-open')) return popover;
  openInfoId = null;
  return null;
}

function setInfoOpen(trigger: HTMLButtonElement, popover: HTMLElement, isOpen: boolean): void {
  popover.classList.toggle('is-open', isOpen);
  trigger.setAttribute('aria-expanded', String(isOpen));
  trigger.classList.toggle('interest-source', isOpen);
  if (isOpen) {
    openInfoId = popover.id;
    positionInfoPopover(trigger, popover);
  } else if (openInfoId === popover.id) {
    openInfoId = null;
  }
}

function hideInfoPopover(trigger: HTMLButtonElement, popover: HTMLElement): void {
  setInfoOpen(trigger, popover, false);
  try {
    popover.hidePopover?.();
  } catch {
    // The fallback can also close an element outside the native top layer.
  }
}

function scheduleInfoPosition(): void {
  if (!openInfoId || positionFrame !== null) return;
  positionFrame = window.requestAnimationFrame(() => {
    positionFrame = null;
    const popover = getOpenInfoPopover();
    if (!popover) return;
    const trigger = getInfoTrigger(popover);
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    if (
      rect.bottom <= 0 ||
      rect.top >= window.innerHeight ||
      rect.right <= 0 ||
      rect.left >= window.innerWidth
    ) {
      hideInfoPopover(trigger, popover);
      return;
    }
    positionInfoPopover(trigger, popover, rect);
  });
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
      const trigger = getInfoTrigger(target);
      if (trigger) setInfoOpen(trigger, target, (event as ToggleEvent).newState === 'open');
    },
    true
  );
  window.addEventListener('scroll', scheduleInfoPosition, { capture: true, passive: true });
  window.addEventListener('resize', scheduleInfoPosition);
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
      const other = getOpenInfoPopover();
      if (other && other !== popover) {
        const otherTrigger = getInfoTrigger(other);
        if (otherTrigger) hideInfoPopover(otherTrigger, other);
      }
      try {
        popover.showPopover?.();
      } catch {
        // CSS also displays the tooltip when native popovers are unavailable.
      }
      setInfoOpen(btn, popover, true);
    };

    const hideInfoImmediate = () => {
      clearHideTimer();
      hideInfoPopover(btn, popover);
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
