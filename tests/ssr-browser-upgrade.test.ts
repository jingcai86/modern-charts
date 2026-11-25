import { expect, it } from 'vitest';

it('upgrades server-rendered chart markup and draws data in the browser', async () => {
  const container = document.createElement('section');
  container.innerHTML = `
    <mc-bar-chart id="revenue-chart" width="520" height="300"></mc-bar-chart>
    <table>
      <caption>Quarterly revenue</caption>
      <tbody><tr><th scope="row">Q1</th><td>12</td></tr></tbody>
    </table>
  `;
  document.body.append(container);

  try {
    expect(customElements.get('mc-bar-chart')).toBeUndefined();
    expect(container.querySelector('#revenue-chart')?.shadowRoot).toBeNull();
    expect(container.querySelector('caption')?.textContent).toBe('Quarterly revenue');

    const { MCBarChart } = await import('../src/entries/bar');
    await customElements.whenDefined('mc-bar-chart');
    const chart = container.querySelector<InstanceType<typeof MCBarChart>>('#revenue-chart')!;

    expect(chart).toBeInstanceOf(MCBarChart);
    chart.config = {
      data: [{ quarter: 'Q1', revenue: 12 }],
      indexBy: 'quarter',
      keys: ['revenue'],
      animate: false
    };

    expect(chart.shadowRoot?.querySelector('.mc-chart-svg')?.getAttribute('viewBox')).toBe('0 0 520 300');
    expect(chart.shadowRoot?.querySelectorAll('.mc-bar-rect')).toHaveLength(1);
    expect(container.querySelector('td')?.textContent).toBe('12');
  } finally {
    container.remove();
  }
});
