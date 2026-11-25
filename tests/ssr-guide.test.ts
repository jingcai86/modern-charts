import { afterEach, describe, expect, it } from 'vitest';
import '../src/index';
import { renderGuidePage } from '../apps/studio/guides';
import { formatConfigAssignment } from '../apps/studio/utils/code-sync';

afterEach(() => document.body.replaceChildren());

describe('Server-Side Rendering Studio guide', () => {
  it('renders the browser preview and keeps the visible table synchronized with its data', () => {
    const root = document.createElement('div');
    document.body.append(root);
    const [chart] = renderGuidePage(root, 'ssr', 'dark');
    const table = root.querySelector<HTMLTableElement>('.guide-table')!;
    const editor = root.querySelector<HTMLTextAreaElement>('.guide-code-editor')!;

    expect(chart.config.themeMode).toBe('dark');
    expect(chart.shadowRoot!.querySelector('.mc-bar-rect')).not.toBeNull();
    expect(table.caption?.textContent).toBe('Sales by quarter');
    expect(table.querySelectorAll('tbody tr')).toHaveLength(2);

    editor.value = formatConfigAssignment({
      ...chart.config,
      data: [{ quarter: 'Q3', sales: 95 }]
    });
    editor.dispatchEvent(new Event('input', { bubbles: true }));

    expect(editor.getAttribute('aria-invalid')).toBe('false');
    expect(chart.config.data).toEqual([{ quarter: 'Q3', sales: 95 }]);
    expect(Array.from(table.querySelectorAll('tbody tr > *'), (cell) => cell.textContent))
      .toEqual(['Q3', '95']);
    expect(table.querySelectorAll('tbody tr')).toHaveLength(1);
  });
});
