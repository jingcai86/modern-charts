export const baseChartStyles = `
      @layer base, theme, state;

      @layer base {
        :host {
          display: block;
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 240px;
          box-sizing: border-box;
          container-type: inline-size;
          --_mc-bg: var(--mc-bg, transparent);
          --_mc-text: var(--mc-text-color, #1e293b);
          --_mc-font: var(--mc-font-family, Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
          --_mc-radius: var(--mc-border-radius, 12px);
          --_mc-focus-ring: var(--mc-focus-color, #38bdf8);
          font-family: var(--_mc-font);
          color: var(--_mc-text);
        }

        :host([hidden]) {
          display: none;
        }

        .mc-chart-container {
          position: relative;
          width: 100%;
          height: 100%;
          min-height: inherit;
          background: var(--_mc-bg);
          border-radius: var(--_mc-radius);
          overflow: hidden;
          box-sizing: border-box;
        }

        .mc-chart-svg {
          display: block;
          width: 100%;
          height: 100%;
          user-select: none;
          overflow: hidden;
          transition: opacity 220ms cubic-bezier(0.22, 1, 0.36, 1);
        }

        :host(:state(loading)) .mc-chart-svg,
        :host([aria-busy="true"]) .mc-chart-svg {
          opacity: 0.38;
        }

        .mc-chart-state {
          opacity: 1;
          translate: 0 0;
          transition:
            display 220ms,
            opacity 220ms cubic-bezier(0.22, 1, 0.36, 1),
            translate 220ms cubic-bezier(0.22, 1, 0.36, 1);
          transition-behavior: allow-discrete;
        }

        @starting-style {
          .mc-chart-state {
            opacity: 0;
            translate: 0 6px;
          }
        }

        .mc-chart-state[hidden] {
          display: none;
          opacity: 0;
          translate: 0 6px;
          pointer-events: none;
        }

        @media (prefers-reduced-motion: reduce) {
          .mc-chart-state,
          .mc-chart-state[hidden] {
            translate: none;
            transition-duration: 0.1s;
          }

          @starting-style {
            .mc-chart-state {
              translate: none;
            }
          }
        }

        .mc-aria-item {
          outline: none;
        }

        .mc-aria-item:focus-visible {
          outline: 2.5px solid var(--_mc-focus-ring);
          outline-offset: 2px;
          filter: brightness(1.16) drop-shadow(0 0 5px var(--_mc-focus-ring));
        }

        .visually-hidden:where(:not(:focus-within, :active)) {
          position: absolute !important;
          clip-path: inset(50%) !important;
          overflow: hidden !important;
          width: 1px !important;
          height: 1px !important;
          margin: -1px !important;
          padding: 0 !important;
          border: 0 !important;
          white-space: nowrap !important;
        }

        .mc-layer {
          transition: opacity 260ms cubic-bezier(0.22, 1, 0.36, 1);
        }

        .mc-layer--markers,
        .mc-layer--markers *,
        .mc-marker,
        .mc-marker *,
        .mc-layer--labels,
        .mc-layer--labels *,
        .mc-layer--outerLabels,
        .mc-layer--outerLabels *,
        .mc-layer--pointLabels,
        .mc-layer--pointLabels *,
        .mc-layer--grid,
        .mc-layer--grid * {
          pointer-events: none;
        }

        .mc-layer--markers .mc-marker-annotation,
        .mc-layer--markers .mc-marker-annotation *,
        .mc-label--interactive,
        .mc-label--interactive * {
          pointer-events: auto;
        }

        [data-event-target] {
          cursor: pointer;
        }

        .mc-label--interactive {
          cursor: pointer;
          outline: none;
        }

        [data-event-target]:focus-visible,
        .mc-label--interactive:focus-visible {
          outline: 2px solid var(--_mc-focus-ring);
          outline-offset: 2px;
        }

        .mc-chart-svg[data-has-selection="true"] [data-selectable="true"]:not([data-selected="true"]) {
          opacity: 0.36;
          transition: opacity 150ms ease, filter 150ms ease, stroke-width 150ms ease;
        }

        [data-selectable="true"][data-selected="true"],
        .mc-item--selected {
          opacity: 1 !important;
          filter: brightness(1.08) drop-shadow(0 0 6px var(--_mc-focus-ring));
        }

        path[data-selectable="true"][data-selected="true"],
        rect[data-selectable="true"][data-selected="true"],
        circle[data-selectable="true"][data-selected="true"],
        polygon[data-selectable="true"][data-selected="true"],
        g[data-selectable="true"][data-selected="true"] > rect,
        g[data-selectable="true"][data-selected="true"] > path {
          stroke: var(--mc-selected-stroke, var(--_mc-text));
          stroke-width: var(--mc-selected-stroke-width, 2.5px);
        }

        .mc-chart-container--static,
        .mc-chart-container--static * {
          cursor: default !important;
        }
        @keyframes mc-layer-reveal {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (prefers-reduced-motion: no-preference) {
          .mc-layer--entering {
            animation: mc-layer-reveal 320ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
          }
        }

        .mc-view-controls {
          position: absolute;
          bottom: 10px;
          right: 12px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: rgba(15, 23, 42, 0.06);
          backdrop-filter: blur(6px);
          padding: 3px;
          border-radius: 8px;
          border: 1px solid rgba(148, 163, 184, 0.25);
          z-index: 5;
        }

        .mc-view-controls[hidden] {
          display: none;
        }

        .mc-view-slider {
          position: absolute;
          left: 48px;
          right: 96px;
          bottom: 10px;
        }

        /* Keep zoom controls clear of the heatmap color legend, even on narrow charts. */
        .mc-chart-container:has(.mc-heatmap-color-legend[data-legend-position="bottom"]):has(> .mc-view-controls:not([hidden]), > .mc-view-slider) {
          display: grid;
          grid-template-rows: minmax(0, 1fr);

          > .mc-view-controls {
            position: static;
            justify-self: end;
            margin: 0 12px 10px;
          }

          > .mc-view-slider {
            position: relative;
            inset: auto;
            margin: 0 12px 10px;
          }
        }

        .mc-view-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font: inherit;
          color: inherit;
          font-size: 11px;
          font-weight: 600;
          line-height: 1;
          padding: 4px 7px;
          border: none;
          border-radius: 5px;
          background: rgba(255, 255, 255, 0.82);
          color: #1e293b;
          cursor: pointer;
          transition: background 150ms ease, transform 100ms ease;
        }

        .mc-view-btn:hover:not(:disabled) {
          background: #ffffff;
        }

        .mc-view-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .mc-view-btn:focus-visible {
          outline: 2px solid var(--_mc-focus-ring);
          outline-offset: 2px;
        }

        .mc-view-btn:active:not(:disabled) {
          transform: scale(0.96);
        }

        .mc-tooltip,
        .mc-legend-tooltip {
          position: absolute;
          top: 0;
          left: 0;
          pointer-events: none;
          z-index: 20;
          transition: opacity 120ms ease, transform 90ms ease;
        }

        .mc-legend-tooltip {
          z-index: 21;
        }

        .mc-tooltip[hidden],
        .mc-legend-tooltip[hidden] {
          display: none;
        }
      }
    `;
