import { GUIDES_CATALOG, type GuideId } from './types';

export function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function createCodeBlock(code: string, title = 'Code Example'): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'guide-code-wrap';
  wrap.innerHTML = `
    <div class="guide-code-header">
      <span class="guide-code-title">${escapeHtml(title)}</span>
      <button type="button" class="guide-copy-btn">Copy</button>
    </div>
    <pre class="guide-code-pre"><code>${escapeHtml(code.trim())}</code></pre>
  `;
  const copyBtn = wrap.querySelector('.guide-copy-btn') as HTMLButtonElement;
  copyBtn.addEventListener('click', () => {
    navigator.clipboard?.writeText(code.trim()).then(() => {
      copyBtn.textContent = '✓ Copied';
      setTimeout(() => {
        copyBtn.textContent = 'Copy';
      }, 1500);
    });
  });
  return wrap;
}

export function renderGuideHeader(activeId: GuideId): HTMLElement {
  const meta = GUIDES_CATALOG.find((g) => g.id === activeId)!;
  const header = document.createElement('section');
  header.className = 'guide-hero';

  const tabsHtml = GUIDES_CATALOG.map(
    (g) => `
      <a
        href="#/guide/${g.id}"
        class="guide-tab-pill ${g.id === activeId ? 'active' : ''}"
      >
        <span>${g.icon}</span>
        <span>${g.shortLabel}</span>
      </a>
    `
  ).join('');

  header.innerHTML = `
    <div class="guide-tabs-bar" role="navigation" aria-label="Documentation Guides">
      ${tabsHtml}
    </div>
    <div class="guide-hero-copy">
      <h1 class="guide-hero-title">${meta.icon} ${escapeHtml(meta.title)}</h1>
      <p class="guide-hero-summary">${escapeHtml(meta.summary)}</p>
    </div>
  `;
  return header;
}
