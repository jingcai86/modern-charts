import { configureChartFeatures } from '../../../src/core/features';
import type { ChartFeaturesConfig } from '../../../src/core/types';
import {
  findChartConfigBlock,
  formatConfigAssignment,
  parseConfigObjectLiteral,
  restoreSerializedFunctions
} from '../utils/code-sync';
import { getByPath, setByPath } from '../utils/object-path';
import { createLiveCodeEditor, type LiveConfigEditorHandle } from './shared';

type BootstrapFeatures = Required<ChartFeaturesConfig>;
type DemoConfig = Record<string, any>;

const BOOTSTRAP_DEFAULTS: BootstrapFeatures = { zoom: false, csvExport: false, chartState: true };

const REGISTER_FN_BY_ID: Record<string, string> = {
  bar: 'registerBarChart',
  line: 'registerLineChart',
  pie: 'registerPieChart',
  heatmap: 'registerHeatmapChart',
  radar: 'registerRadarChart',
  sunburst: 'registerSunburstChart',
  sankey: 'registerSankeyChart',
  scatter: 'registerScatterChart',
  treemap: 'registerTreemapChart',
  gauge: 'registerGaugeChart'
};

export function parseBootstrap(source: string) {
  const code = source.trim();
  const declaration = /^import\s*\{\s*(register\w+)\s*\}\s*from\s*(['"])(modern-charts(?:\/[a-z]+)?)\2/.exec(code);
  if (!declaration) throw new SyntaxError('Use a Modern Charts import followed by its registration call.');

  const [, registrar, , modulePath] = declaration;
  const chartId = modulePath === 'modern-charts' ? undefined : modulePath.slice('modern-charts/'.length);
  const expectedRegistrar = chartId ? REGISTER_FN_BY_ID[chartId] : 'registerModernCharts';
  const call = code.slice(declaration[0].length).trim().replace(/^;|;$/g, '').trim();
  const registration = /^(?:await\s+)?(register\w+)\s*\(([\s\S]*)\)$/.exec(call);
  if (registrar !== expectedRegistrar || registration?.[1] !== registrar) {
    throw new SyntaxError('Match the registration function to its Modern Charts import.');
  }

  const rawOptions = registration[2].trim();
  const literal = rawOptions.replace(/,$/, '').trimEnd();
  if (rawOptions && (!literal.startsWith('{') || !literal.endsWith('}'))) {
    throw new SyntaxError('Pass feature options as an object.');
  }
  const options: Record<string, unknown> = literal ? parseConfigObjectLiteral(literal) : {};
  const features: unknown = 'features' in options ? options.features : options;
  if (!features || typeof features !== 'object' || Array.isArray(features) ||
      Object.entries(features).some(([key, value]) =>
        !Object.hasOwn(BOOTSTRAP_DEFAULTS, key) || typeof value !== 'boolean')) {
    throw new SyntaxError('Set zoom, csvExport, and chartState to true or false.');
  }
  return { chartId, ...BOOTSTRAP_DEFAULTS, ...features };
}

export function formatBootstrap(
  chartId: string | undefined,
  features: BootstrapFeatures,
  showChartStateOptOut = false
): string {
  const registrar = chartId ? REGISTER_FN_BY_ID[chartId] : 'registerModernCharts';
  const modulePath = chartId ? `modern-charts/${chartId}` : 'modern-charts';
  const featureLines = showChartStateOptOut
    ? [
        '  features: {',
        `    zoom: ${features.zoom},`,
        `    csvExport: ${features.csvExport},`,
        features.chartState
          ? '    // chartState: false // Uncomment to disable the loading and empty overlay.'
          : '    chartState: false',
        '  }'
      ]
    : [`  features: { zoom: ${features.zoom}, csvExport: ${features.csvExport}, chartState: ${features.chartState} }`];
  return [
    `import { ${registrar} } from '${modulePath}';`,
    '',
    `await ${registrar}({`,
    ...featureLines,
    '});'
  ].join('\n');
}

interface FeatureGuideEditorOptions {
  title: string;
  initialConfig: DemoConfig;
  chartId: () => string;
  usage: string;
  showChartStateOptOut?: boolean;
  onUsageChange?: (usage: string) => void;
  hint?: string;
  knownCallbacks?: Record<string, (...args: any[]) => unknown>;
  onConfigChange: (config: DemoConfig) => void;
  onReset: () => void;
}

/** Keep guide examples consistent with the library's shared bootstrap feature flags. */
export function createFeatureGuideBootstrap(initialFeatures: ChartFeaturesConfig) {
  const defaultFeatures = { ...BOOTSTRAP_DEFAULTS, ...initialFeatures };
  let features = defaultFeatures;
  const refreshEditors = new Set<() => void>();
  const featureListeners = new Set<() => void>();
  void configureChartFeatures({ features });

  const setFeatures = (next: BootstrapFeatures, source?: () => void): Promise<void> => {
    if (next.zoom === features.zoom && next.csvExport === features.csvExport &&
        next.chartState === features.chartState) return Promise.resolve();
    features = next;
    const ready = configureChartFeatures({ features });
    for (const refresh of refreshEditors) {
      if (refresh !== source) refresh();
    }
    for (const listener of featureListeners) listener();
    return ready;
  };

  return {
    updateFeatures(next: ChartFeaturesConfig): Promise<void> {
      return setFeatures({ ...features, ...next });
    },
    onFeaturesChanged(listener: () => void): void {
      featureListeners.add(listener);
      listener();
    },
    createEditor(options: FeatureGuideEditorOptions): LiveConfigEditorHandle {
      let config = options.initialConfig;
      let usage = options.usage;
      let standalone = true;
      const callbacks = Object.entries(options.knownCallbacks ?? {}).map(([path, callback]) => ({
        path,
        callback,
        expression: callback.toString(),
        placeholder: `[Guide callback ${path}]`
      }));

      const formatExample = () => {
        const chartId = options.chartId();
        const copyableConfig = { ...config };
        for (const { path, callback, placeholder } of callbacks) {
          if (getByPath(config, path) === callback) setByPath(copyableConfig, path, placeholder);
        }
        let assignment = formatConfigAssignment(copyableConfig);
        for (const { expression, placeholder } of callbacks) {
          assignment = assignment.replace(`'${placeholder}'`, () => expression);
        }
        return [
          formatBootstrap(standalone ? chartId : undefined, features, options.showChartStateOptOut),
          `const chart = document.createElement('mc-${chartId}-chart');\nchart.style.height = '380px';\ndocument.body.appendChild(chart);`,
          assignment,
          usage
        ].join('\n\n');
      };

      const refresh = () => editor.setValue(formatExample(), { resetBaseline: false });
      const editor = createLiveCodeEditor({
        title: options.title,
        language: 'js',
        initialValue: formatExample(),
        hint: options.hint ?? 'Edit the bootstrap flags or chart.config. The flags apply to both examples.',
        onApply: (source) => {
          const chart = /^[ \t]*const\s+chart\s*=\s*document\.createElement\(\s*(['"])(mc-[a-z]+-chart)\1\s*\)/m.exec(source);
          const chartId = options.chartId();
          if (!chart || chart[2] !== `mc-${chartId}-chart`) {
            return 'Create the chart type shown in this example.';
          }
          const { chartId: registeredChart, ...nextFeatures } = parseBootstrap(source.slice(0, chart.index));
          if (registeredChart && registeredChart !== chartId) {
            return 'Use the selected chart’s subpath or the full library import.';
          }
          const chartSource = source.slice(chart.index);
          const block = findChartConfigBlock(chartSource);
          if (!block) return 'Complete the chart.config object to update the preview.';
          let { literal } = block;
          for (const { expression, placeholder } of callbacks) {
            literal = literal.replace(expression, () => `'${placeholder}'`);
          }
          const parsed = restoreSerializedFunctions(parseConfigObjectLiteral(literal), config) as DemoConfig;
          for (const { path, callback, placeholder } of callbacks) {
            if (getByPath(parsed, path) === placeholder) setByPath(parsed, path, callback);
          }
          if (options.onUsageChange) {
            const nextUsage = chartSource.slice(block.end).trimStart().replace(/^;/, '').trim();
            if (nextUsage !== usage) {
              options.onUsageChange(nextUsage);
              usage = nextUsage;
            }
          }
          standalone = registeredChart !== undefined;
          config = parsed;
          void setFeatures(nextFeatures, refresh);
          options.onConfigChange(config);
        },
        onReset: () => {
          if (usage !== options.usage) {
            options.onUsageChange?.(options.usage);
            usage = options.usage;
          }
          standalone = true;
          void setFeatures(defaultFeatures, refresh);
          options.onReset();
        }
      });
      refreshEditors.add(refresh);
      return {
        ...editor,
        syncConfig: (nextConfig, opts = {}) => {
          config = nextConfig;
          if (opts.title) editor.setTitle(opts.title);
          editor.setValue(formatExample(), opts);
        }
      };
    }
  };
}
