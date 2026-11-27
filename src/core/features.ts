import type {
  ChartBootstrapOptions,
  ChartConfig,
  ChartDimensions,
  ChartFeaturesConfig,
  CsvExportOptions,
  CsvExportPayload,
  ViewConfig
} from './types';
import type { ChartI18n } from './i18n';
import { loadChartStateView } from '../components/chart-state-loader';

export interface ZoomViewControllerLike {
  readonly hasInteraction: boolean;
  readonly zoomable: boolean;
  getTransform(): { k: number; x: number; y: number };
  scaleBy(factor: number): void;
  reset(): void;
  setZoomable(zoomable: boolean): void;
  destroy(): void;
  bindControls(): void;
  configure(
    svg: SVGSVGElement,
    viewportGroup: SVGGElement,
    viewConfig: ViewConfig,
    dims: ChartDimensions
  ): void;
}

export type ZoomControllerFactory = (
  host: HTMLElement,
  onZoomChange: (zoomed: boolean) => void,
  onToggleZoom?: () => void
) => ZoomViewControllerLike;

export interface CsvExporterImplementation {
  serialize: <
    TData = any,
    TRow extends Record<string, unknown> = Record<string, unknown>
  >(
    chartType: string,
    data: TData,
    options?: CsvExportOptions<TData, TRow>,
    config?: ChartConfig<TData>,
    i18n?: ChartI18n
  ) => CsvExportPayload<TData, TRow>;
  download: (csv: string, filename: string, mimeType?: string) => boolean;
}

const activeFeatures: Required<ChartFeaturesConfig> = {
  zoom: false,
  csvExport: false,
  chartState: true
};

let zoomControllerFactory: ZoomControllerFactory | null = null;
let csvExporterImpl: CsvExporterImplementation | null = null;
let chartStateLoad: Promise<void> | undefined;
const featureListeners = new Set<() => void>();

function notifyFeatureListeners(): void {
  for (const listener of [...featureListeners]) {
    listener();
  }
}

/** Registers the lazy-loaded zoom controller factory without changing the active `zoom` feature flag. */
export function registerZoomControllerFactory(
  factory: ZoomControllerFactory
): void {
  zoomControllerFactory = factory;
}

/** Creates a zoom controller instance when the zoom feature is enabled and loaded. */
export function createZoomController(
  host: HTMLElement,
  onZoomChange: (zoomed: boolean) => void,
  onToggleZoom?: () => void
): ZoomViewControllerLike | null {
  if (!activeFeatures.zoom || !zoomControllerFactory) return null;
  return zoomControllerFactory(host, onZoomChange, onToggleZoom);
}

/** Registers the lazy-loaded CSV exporter implementation without changing the active `csvExport` feature flag. */
export function registerCsvExporter(impl: CsvExporterImplementation): void {
  csvExporterImpl = impl;
}

/** Returns the active CSV exporter implementation when `features.csvExport` is enabled, or `null` when disabled. */
export function getCsvExporter(): CsvExporterImplementation | null {
  if (!activeFeatures.csvExport || !csvExporterImpl) return null;
  return csvExporterImpl;
}

/** Returns whether an optional chart feature is currently enabled. */
export function isChartFeatureEnabled(
  feature: keyof ChartFeaturesConfig
): boolean {
  return Boolean(activeFeatures[feature]);
}

/** Returns a snapshot of the active feature flags. */
export function getChartFeatures(): Readonly<Required<ChartFeaturesConfig>> {
  return Object.freeze({ ...activeFeatures });
}

/** Subscribes to changes in optional chart features. */
export function subscribeChartFeatures(listener: () => void): () => void {
  featureListeners.add(listener);
  return () => {
    featureListeners.delete(listener);
  };
}

function extractFeatureFlags(
  options?: ChartBootstrapOptions | ChartFeaturesConfig
): ChartFeaturesConfig {
  if (!options || typeof options !== 'object') return {};
  const asBootstrap = options as ChartBootstrapOptions;
  const nested = asBootstrap.features ?? {};
  const zoom =
    nested.zoom !== undefined
      ? nested.zoom
      : (options as ChartFeaturesConfig).zoom;
  const csvExport =
    nested.csvExport !== undefined
      ? nested.csvExport
      : (options as ChartFeaturesConfig).csvExport;
  const chartState = nested.chartState ?? asBootstrap.chartState;
  return {
    ...(zoom !== undefined ? { zoom: Boolean(zoom) } : {}),
    ...(csvExport !== undefined ? { csvExport: Boolean(csvExport) } : {}),
    ...(chartState !== undefined ? { chartState: Boolean(chartState) } : {})
  };
}

/**
 * Configures optional chart features and loads their enabled implementations.
 * Chart state defaults to enabled. Zoom and CSV export default to disabled.
 */
export function configureChartFeatures(
  options?: ChartBootstrapOptions | ChartFeaturesConfig
): Promise<void> {
  const flags = extractFeatureFlags(options);

  let changed = false;
  if (flags.zoom !== undefined && activeFeatures.zoom !== flags.zoom) {
    activeFeatures.zoom = flags.zoom;
    changed = true;
  }
  if (
    flags.csvExport !== undefined &&
    activeFeatures.csvExport !== flags.csvExport
  ) {
    activeFeatures.csvExport = flags.csvExport;
    changed = true;
  }
  if (flags.chartState !== undefined && activeFeatures.chartState !== flags.chartState) {
    activeFeatures.chartState = flags.chartState;
    changed = true;
  }

  const pendingLoads: Promise<unknown>[] = [];
  if (activeFeatures.zoom && !zoomControllerFactory) {
    pendingLoads.push(
      import('./chart-view-controller').then(() => {
        notifyFeatureListeners();
      })
    );
  }
  if (activeFeatures.csvExport && !csvExporterImpl) {
    pendingLoads.push(
      import('./csv-export').then(() => {
        notifyFeatureListeners();
      })
    );
  }
  if (activeFeatures.chartState && typeof document !== 'undefined') {
    chartStateLoad ??= loadChartStateView()?.then(() => {
      if (activeFeatures.chartState) notifyFeatureListeners();
    }).finally(() => {
      chartStateLoad = undefined;
    });
    if (chartStateLoad) pendingLoads.push(chartStateLoad);
  }

  if (changed) {
    notifyFeatureListeners();
  }

  return pendingLoads.length > 0
    ? Promise.all(pendingLoads).then(() => undefined)
    : Promise.resolve();
}
