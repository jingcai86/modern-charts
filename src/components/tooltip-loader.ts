type TooltipViewFactory = typeof import('./tooltip-view').createTooltipView;

let viewFactory: TooltipViewFactory | undefined;
let pendingView: Promise<void> | undefined;

export function getTooltipViewFactory(): TooltipViewFactory | undefined {
  return viewFactory;
}

export function loadTooltipView(): Promise<void> | undefined {
  if (viewFactory) return undefined;
  pendingView ??= import('./tooltip-view')
    .then(({ createTooltipView }) => {
      viewFactory = createTooltipView;
    })
    .finally(() => {
      pendingView = undefined;
    });
  return pendingView;
}
