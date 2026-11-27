type ChartStateViewFactory = typeof import('./chart-state-view').createChartStateView;

let viewFactory: ChartStateViewFactory | undefined;
let pendingView: Promise<void> | undefined;

export function getChartStateViewFactory(): ChartStateViewFactory | undefined {
  return viewFactory;
}

export function loadChartStateView(): Promise<void> | undefined {
  if (viewFactory) return undefined;
  pendingView ??= import('./chart-state-view')
    .then(({ createChartStateView }) => {
      viewFactory = createChartStateView;
    })
    .finally(() => {
      pendingView = undefined;
    });
  return pendingView;
}
