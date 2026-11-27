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

        .mc-view-btn {
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

        .mc-view-btn--toggle[aria-pressed="true"] {
          background: #0284c7;
          color: #ffffff;
        }

        .mc-view-btn--toggle[aria-pressed="true"]:hover:not(:disabled) {
          background: #0369a1;
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
