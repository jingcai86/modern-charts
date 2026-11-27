import type { ChartConfig } from '../../../../src/index';
import {
  SVG_ICON_PRESETS,
  type ChartAttributeSpec,
  type ChartCatalogEntry
} from '../../catalog';
import {
  buildMarkersForVirtualState,
  type ChartVirtualState
} from '../../state/config-store';
import { escapeHtml } from '../../utils/html';
import { getByPath, setByPath } from '../../utils/object-path';
import {
  renderSectionInfoTooltip,
  wireSectionInfoTooltips
} from './section-info';

export interface AttributePanelHandle {
  element: HTMLElement;
  syncAllControls: () => void;
}

function stripInlineAnnotations(text: string, annotation: RegExp): string {
  const parts = text.split(annotation);
  return parts.map((part, index) => index === parts.length - 1 ? part : part.trimEnd()).join('');
}

/**
 * Renders the collapsible Nivo-style attribute & config control panel on the right
 * side of the Chart Detail Playground, with search filtering and Expand/Minimize All.
 */
export function createAttributePanel(opts: {
  entry: ChartCatalogEntry;
  config: ChartConfig<any>;
  vState: ChartVirtualState;
  allAttributes: ChartAttributeSpec[];
  onConfigChanged: () => void;
  onResetDefault: () => void;
  onClearSelection?: () => void;
}): AttributePanelHandle {
  const {
    entry,
    config,
    vState,
    allAttributes,
    onConfigChanged,
    onResetDefault,
    onClearSelection
  } = opts;
  type AttributeScope = 'specific' | 'common';
  const specificPaths = new Set(entry.specificAttributes.map((spec) => spec.configPath));
  const scopeFor = (spec: ChartAttributeSpec): AttributeScope =>
    specificPaths.has(spec.configPath) ? 'specific' : 'common';
  const commonCategoryOrder: ChartAttributeSpec['category'][] = [
    'Sizing & Layout',
    'Theme Layer (<mc-theme-layer>)',
    'Universal Label (<mc-label>)',
    'Legend (<mc-legend>)',
    'Tooltip (<mc-tooltip>)',
    'View & Zoom (<mc-view-layer>)',
    'Selection',
    'Marker & Threshold (<mc-marker-layer>)',
    'Animation (<mc-animation-layer>)',
    'Accessibility (<mc-aria-layer>)',
    'Internationalization'
  ];
  const scopes = [
    {
      id: 'specific' as const,
      label: 'Chart-specific'
    },
    {
      id: 'common' as const,
      label: 'Common'
    }
  ].map((scope) => ({
    ...scope,
    specs: allAttributes.filter((spec) => scopeFor(spec) === scope.id)
  }));

  const attributesSection = document.createElement('div');
  attributesSection.className = 'panel-card attributes-panel-card';
  attributesSection.innerHTML = `
    <div class="attributes-section-header">
      <div class="panel-title-group">
        <h2 class="panel-title">Attributes &amp; Config</h2>
        ${renderSectionInfoTooltip(
          `detail-attrs-info-${entry.id}`,
          'More about Attributes & Config',
          `Interactive controls for chart-specific options and shared layers on <code>&lt;${escapeHtml(entry.tagName)}&gt;</code>. Changes update the live chart and HTML markup immediately.`
        )}
        <button type="button" id="btn-reset-default-attrs">Reset Default</button>
      </div>
      <div class="attributes-filter-bar">
        <button type="button" id="btn-expand-all-attrs">Expand All</button>
        <button type="button" id="btn-collapse-all-attrs">Minimize All</button>
        <input
          type="text"
          id="attr-search-input"
          class="attr-search-input"
          placeholder="Filter attributes..."
          aria-label="Filter attributes"
          aria-controls="attributes-categories-grid"
        />
      </div>
    </div>
    <div class="attributes-scope-filter" role="group" aria-label="Attribute scope">
      <button type="button" class="attr-scope-filter-button" data-scope="all" aria-pressed="true" aria-controls="attributes-categories-grid">All</button>
      ${scopes.map((scope) => `<button type="button" class="attr-scope-filter-button" data-scope="${scope.id}" aria-pressed="false" aria-controls="attributes-categories-grid">${scope.label}</button>`).join('')}
    </div>
    <div class="attributes-accordion-list" id="attributes-categories-grid"></div>
  `;

  const categoriesGrid = attributesSection.querySelector(
    '#attributes-categories-grid'
  ) as HTMLElement;

  const categories = scopes.flatMap((scope) => {
    if (!scope.specs.length) return [];
    const group = document.createElement('section');
    group.className = 'attr-scope-group';
    group.dataset.scope = scope.id;
    group.setAttribute('aria-labelledby', `attr-scope-${scope.id}-title`);
    group.innerHTML = `
      <h3 class="attr-scope-title" id="attr-scope-${scope.id}-title">${scope.label}</h3>
      <div class="attr-scope-categories"></div>
    `;
    categoriesGrid.appendChild(group);
    const container = group.querySelector('.attr-scope-categories') as HTMLElement;
    const names = Array.from(new Set(scope.specs.map((spec) => spec.category)));
    if (scope.id === 'common') {
      const rank = (name: ChartAttributeSpec['category']) => {
        const index = commonCategoryOrder.indexOf(name);
        return index < 0 ? commonCategoryOrder.length : index;
      };
      names.sort((a, b) => rank(a) - rank(b));
    }
    return names.map((name) => ({
      name,
      scope,
      container,
      specs: scope.specs.filter((spec) => spec.category === name)
    }));
  });

  const emptyState = document.createElement('p');
  emptyState.className = 'attr-empty-state';
  emptyState.hidden = true;
  emptyState.setAttribute('role', 'status');
  emptyState.setAttribute('aria-live', 'polite');
  emptyState.textContent = 'No matching attributes.';
  categoriesGrid.appendChild(emptyState);

  const controlSyncCallbacks = new Map<string, () => void>();
  const conditionalRows = new Map<HTMLElement, NonNullable<ChartAttributeSpec['visibleWhen']>>();
  const isHeatmapLegendControl = (spec: ChartAttributeSpec) =>
    entry.id === 'heatmap' && spec.configPath.startsWith('legend.');

  function getAttributeValue(spec: ChartAttributeSpec): any {
    if (spec.configPath.startsWith('__')) {
      return (vState as any)[spec.configPath] ?? spec.defaultValue;
    }
    if (isHeatmapLegendControl(spec)) {
      const legend = config.legend;
      if (spec.configPath === 'legend.enabled' && typeof legend === 'boolean') return legend;
      if (spec.configPath.startsWith('legend.padding.') && typeof legend === 'object' && typeof legend?.padding === 'number') {
        return legend.padding;
      }
    }
    if (spec.configPath === 'selection.enabled') {
      if (typeof config.selection === 'boolean') return config.selection;
      if (
        typeof config.selection === 'object' &&
        config.selection?.enabled !== undefined
      ) {
        return config.selection.enabled;
      }
      if (config.selectable !== undefined) return config.selectable;
    }
    if (spec.configPath === 'selection.mode') {
      if (
        typeof config.selection === 'object' &&
        config.selection?.mode !== undefined
      ) {
        return config.selection.mode;
      }
      if (config.selectionMode !== undefined) return config.selectionMode;
    }
    const val = getByPath(config, spec.configPath);
    return val !== undefined ? val : spec.defaultValue;
  }

  function setHeatmapLegendValue(path: string, value: unknown): void {
    const legend = config.legend;
    if (typeof legend === 'boolean') {
      config.legend = { enabled: legend };
    } else if (typeof legend?.padding === 'number' && path.startsWith('legend.padding.')) {
      const padding = legend.padding;
      config.legend = { ...legend, padding: { top: padding, right: padding, bottom: padding, left: padding } };
    }

    if (path.startsWith('legend.tickFormat.') && (value === '' || value === undefined)) {
      const format = getByPath(config, 'legend.tickFormat');
      if (!format || typeof format !== 'object') return;
      const options = { ...format };
      delete options[path.split('.')[2]];
      setByPath(config, 'legend.tickFormat', Object.keys(options).length ? options : undefined);
      return;
    }

    const clearsLabel = value === '' && (path === 'legend.minLabel' || path === 'legend.maxLabel');
    setByPath(config, path, clearsLabel ? undefined : value);
  }

  function setAttributeValue(spec: ChartAttributeSpec, rawVal: any): void {
    if (spec.configPath.startsWith('__')) {
      (vState as any)[spec.configPath] = rawVal;
      if (spec.configPath === '__labelIconPreset') {
        const iconSvg = SVG_ICON_PRESETS[String(rawVal)];
        const prevLabel = !Array.isArray(config.label) ? config.label ?? {} : {};
        if (iconSvg) {
          config.labelMode = 'foreignObject';
          config.label = {
            ...prevLabel,
            renderMode: 'foreignObject',
            icon: iconSvg,
            iconPosition: 'start'
          };
        } else {
          const copy = { ...prevLabel };
          delete copy.icon;
          config.label = copy;
        }
        controlSyncCallbacks.get('labelMode')?.();
      } else {
        config.markers = buildMarkersForVirtualState(entry, vState);
      }
    } else if (
      spec.configPath === 'i18n.locale' ||
      spec.configPath === 'i18n.timeZone'
    ) {
      const value = String(rawVal).trim();
      if (value) {
        setByPath(config, spec.configPath, value);
      } else {
        const i18n = getByPath(config, 'i18n');
        if (i18n && typeof i18n === 'object') {
          delete i18n[spec.configPath.split('.')[1]];
        }
      }
    } else if (spec.configPath === 'tooltip.position' && rawVal === '') {
      if (config.tooltip && typeof config.tooltip === 'object') {
        delete config.tooltip.position;
      }
    } else if (
      (spec.configPath === 'labelOverflow.maxWidth' ||
        spec.configPath === 'labelOverflow.maxChars') &&
      Number(rawVal) <= 0
    ) {
      if (config.labelOverflow && typeof config.labelOverflow === 'object') {
        const key = spec.configPath.split('.')[1] as 'maxWidth' | 'maxChars';
        delete (config.labelOverflow as Record<string, any>)[key];
      }
    } else if (isHeatmapLegendControl(spec)) {
      setHeatmapLegendValue(spec.configPath, rawVal);
    } else if (spec.configPath.startsWith('selection.')) {
      if (typeof config.selection === 'boolean') {
        config.selection = { enabled: config.selection };
      }
      setByPath(config, spec.configPath, rawVal);
    } else {
      setByPath(config, spec.configPath, rawVal);
    }

    if (entry.id === 'heatmap' && spec.configPath === 'legend.type') {
      controlSyncCallbacks.get('legend.labelPlacement')?.();
    }
    if (conditionalRows.size) filterAttributes();
    onConfigChanged();
  }

  categories.forEach(({ name: categoryName, scope, container, specs: specsInCat }, catIdx) => {
    const catDetails = document.createElement('details');
    catDetails.className = 'attr-category-accordion';
    catDetails.dataset.category = categoryName;
    catDetails.dataset.scope = scope.id;
    if (catIdx === 0) {
      catDetails.open = true;
    }

    const isHeatmapColorLegend = entry.id === 'heatmap' && categoryName === 'Legend (<mc-legend>)';
    const cleanCatTitle = isHeatmapColorLegend
      ? 'Color legend'
      : categoryName === 'Chart-Specific'
      ? 'Chart options'
      : stripInlineAnnotations(categoryName, /\(<mc-[a-z0-9-]+>\)/);
    const info = isHeatmapColorLegend
      ? renderSectionInfoTooltip(
          'detail-color-legend-info',
          'More about the heatmap color legend',
          'Use Continuous for a gradient or Discrete for ranges that share a color. The same scale colors both the cells and the legend.'
        )
      : '';
    catDetails.innerHTML = `
      <summary class="attr-category-summary">
        <div class="attr-category-summary-left">
          <span class="attr-chevron" aria-hidden="true">▸</span>
          <span class="attr-category-name">${escapeHtml(cleanCatTitle)}</span>
          ${info}
        </div>
      </summary>
      <div class="attr-list"></div>
    `;

    const attrList = catDetails.querySelector('.attr-list') as HTMLElement;

    specsInCat.forEach((spec) => {
      const row = document.createElement('div');
      row.className = 'attr-row';
      row.dataset.scope = scope.id;
      row.dataset.configPath = spec.configPath;
      if (spec.visibleWhen) conditionalRows.set(row, spec.visibleWhen);
      row.dataset.searchText =
        `${spec.configPath} ${spec.attrName} ${spec.description} ${spec.category}`.toLowerCase();

      const cleanAttrBadge = stripInlineAnnotations(spec.attrName, /\/\s*mc-[a-z-]+\[[^[\]]+\]/)
        .replace(/^mc-[a-z-]+\[([^\]]+)\]$/, '$1');
      const displayTitle =
        spec.label ??
        (spec.configPath.startsWith('__')
          ? spec.configPath.replace('__', '')
          : spec.configPath);
      const metaDiv = document.createElement('div');
      metaDiv.className = 'attr-meta';
      metaDiv.innerHTML = `
        <div class="attr-names">
          <span class="attr-config-path">${escapeHtml(displayTitle)}</span>
          <span class="attr-html-badge">${escapeHtml(cleanAttrBadge)}</span>
        </div>
      `;
      metaDiv.querySelector<HTMLElement>('.attr-config-path')!.title = spec.description;

      const controlCell = document.createElement('div');
      controlCell.className = 'attr-control-cell';
      const currentVal = getAttributeValue(spec);

      if (spec.control === 'boolean') {
        const label = document.createElement('label');
        label.className = 'toggle-switch';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = Boolean(currentVal);
        if (spec.label) {
          checkbox.setAttribute('aria-label', spec.label);
        }
        const stateSpan = document.createElement('span');
        stateSpan.textContent = checkbox.checked ? 'true' : 'false';

        checkbox.addEventListener('change', () => {
          stateSpan.textContent = checkbox.checked ? 'true' : 'false';
          setAttributeValue(spec, checkbox.checked);
        });

        controlSyncCallbacks.set(spec.configPath, () => {
          const v = Boolean(getAttributeValue(spec));
          checkbox.checked = v;
          stateSpan.textContent = v ? 'true' : 'false';
        });

        label.appendChild(checkbox);
        label.appendChild(stateSpan);
        controlCell.appendChild(label);
      } else if (spec.control === 'range') {
        const wrap = document.createElement('div');
        wrap.className = 'attr-range-wrap';
        const range = document.createElement('input');
        range.type = 'range';
        range.min = String(spec.min ?? 0);
        range.max = String(spec.max ?? 100);
        range.step = String(spec.step ?? 1);
        range.value = String(currentVal ?? spec.defaultValue);

        const valBadge = document.createElement('span');
        valBadge.className = 'attr-range-val';
        valBadge.textContent = String(range.value);

        range.addEventListener('input', () => {
          const num = Number(range.value);
          valBadge.textContent = String(num);
          setAttributeValue(spec, num);
        });

        controlSyncCallbacks.set(spec.configPath, () => {
          const v = getAttributeValue(spec);
          range.value = String(v ?? spec.defaultValue);
          valBadge.textContent = String(range.value);
        });

        wrap.appendChild(range);
        wrap.appendChild(valBadge);
        controlCell.appendChild(wrap);
      } else if (spec.control === 'number') {
        const input = document.createElement('input');
        input.type = 'number';
        if (spec.min !== undefined) input.min = String(spec.min);
        if (spec.max !== undefined) input.max = String(spec.max);
        if (spec.step !== undefined) input.step = String(spec.step);
        input.value =
          currentVal === 'auto' || currentVal === undefined
            ? ''
            : String(currentVal);
        input.placeholder = 'auto';

        input.addEventListener('input', () => {
          const raw = input.value.trim();
          const emptyValue = spec.defaultValue === undefined ? undefined : 'auto';
          const parsed = raw === '' ? emptyValue : Number(raw);
          setAttributeValue(
            spec,
            typeof parsed === 'number' && !Number.isFinite(parsed) ? emptyValue : parsed
          );
        });

        controlSyncCallbacks.set(spec.configPath, () => {
          const v = getAttributeValue(spec);
          input.value = v === 'auto' || v === undefined ? '' : String(v);
        });

        controlCell.appendChild(input);
      } else if (spec.control === 'select') {
        const select = document.createElement('select');
        if (spec.label) {
          select.setAttribute('aria-label', spec.label);
        }
        (spec.options ?? []).forEach((opt) => {
          const optionEl = document.createElement('option');
          optionEl.value = opt.value;
          optionEl.textContent = opt.label;
          if (String(currentVal) === opt.value) {
            optionEl.selected = true;
          }
          select.appendChild(optionEl);
        });

        select.addEventListener('change', () => {
          setAttributeValue(spec, select.value);
        });

        const discreteTicks = entry.id === 'heatmap' && spec.configPath === 'legend.labelPlacement'
          ? select.querySelector<HTMLOptionElement>('option[value="ticks"]')
          : null;
        const syncSelection = () => {
          const v = String(getAttributeValue(spec));
          if (discreteTicks) discreteTicks.disabled = getByPath(config, 'legend.type') !== 'discrete';
          select.value = discreteTicks?.disabled && v === 'ticks' ? String(spec.defaultValue) : v;
        };
        controlSyncCallbacks.set(spec.configPath, syncSelection);
        if (discreteTicks) syncSelection();

        controlCell.appendChild(select);
      } else if (spec.control === 'color') {
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.value = String(currentVal || '#ef4444');
        colorInput.style.width = '44px';
        colorInput.style.height = '30px';
        colorInput.style.border = 'none';
        colorInput.style.background = 'transparent';
        colorInput.style.cursor = 'pointer';

        const hexLabel = document.createElement('span');
        hexLabel.className = 'attr-range-val';
        hexLabel.textContent = colorInput.value;

        colorInput.addEventListener('input', () => {
          hexLabel.textContent = colorInput.value;
          setAttributeValue(spec, colorInput.value);
        });

        controlSyncCallbacks.set(spec.configPath, () => {
          const v = String(getAttributeValue(spec) || '#ef4444');
          colorInput.value = v;
          hexLabel.textContent = v;
        });

        controlCell.appendChild(colorInput);
        controlCell.appendChild(hexLabel);
      } else {
        const textInput = document.createElement('input');
        textInput.type = 'text';
        textInput.value = String(currentVal ?? '');

        textInput.addEventListener('input', () => {
          const isLocale = spec.configPath === 'i18n.locale';
          const isTimeZone = spec.configPath === 'i18n.timeZone';
          if (isLocale || isTimeZone) {
            const value = textInput.value.trim();
            let validationMessage = '';
            if (value) {
              try {
                if (isLocale) {
                  Intl.getCanonicalLocales(value);
                } else {
                  new Intl.DateTimeFormat('en-US', { timeZone: value });
                }
              } catch {
                validationMessage = isLocale
                  ? 'Enter a valid locale, such as en-US or ar-EG.'
                  : 'Enter a valid IANA time zone, such as Europe/Berlin.';
              }
            }
            textInput.setCustomValidity(validationMessage);
            if (validationMessage) {
              textInput.setAttribute('aria-invalid', 'true');
              return;
            }
            textInput.removeAttribute('aria-invalid');
          }
          setAttributeValue(spec, textInput.value);
        });

        controlSyncCallbacks.set(spec.configPath, () => {
          const v = getAttributeValue(spec);
          textInput.value = String(v ?? '');
          textInput.setCustomValidity('');
          textInput.removeAttribute('aria-invalid');
        });

        controlCell.appendChild(textInput);
      }

      row.appendChild(metaDiv);
      row.appendChild(controlCell);
      attrList.appendChild(row);
    });

    if (categoryName === 'Selection') {
      const actionsRow = document.createElement('div');
      actionsRow.className = 'attr-category-actions';
      actionsRow.style.padding = '4px 0 2px';
      const clearBtn = document.createElement('button');
      clearBtn.type = 'button';
      clearBtn.id = 'btn-detail-clear-selection';
      clearBtn.dataset.action = 'clear-selection';
      clearBtn.textContent = 'Clear selection';
      clearBtn.addEventListener('click', () => {
        onClearSelection?.();
      });
      actionsRow.appendChild(clearBtn);
      attrList.appendChild(actionsRow);
    }

    container.appendChild(catDetails);
  });

  const cards = Array.from(categoriesGrid.querySelectorAll<HTMLDetailsElement>(
    '.attr-category-accordion'
  ));
  const searchInput = attributesSection.querySelector(
    '#attr-search-input'
  ) as HTMLInputElement;
  const scopeButtons = Array.from(attributesSection.querySelectorAll<HTMLButtonElement>(
    '.attr-scope-filter-button'
  ));
  let activeScope: AttributeScope | 'all' = 'all';
  let beforeSearchOpen: Map<HTMLDetailsElement, boolean> | undefined;

  function filterAttributes(): void {
    const query = searchInput.value.trim().toLowerCase();
    if (query && !beforeSearchOpen) {
      beforeSearchOpen = new Map(cards.map((card) => [card, card.open]));
    }
    let hasMatches = false;
    cards.forEach((card) => {
      const rows = Array.from(card.querySelectorAll<HTMLElement>('.attr-row'));
      const scopeMatches = activeScope === 'all' || card.dataset.scope === activeScope;
      let cardHasMatches = false;
      rows.forEach((row) => {
        const visible = conditionalRows.get(row)?.(config) ?? true;
        const matches = scopeMatches && visible && (!query || (row.dataset.searchText ?? '').includes(query));
        row.hidden = !matches;
        if (matches) cardHasMatches = true;
      });
      card.hidden = !cardHasMatches;
      hasMatches ||= cardHasMatches;
      if (query && cardHasMatches) {
        card.open = true;
      } else if (!query && beforeSearchOpen) {
        card.open = beforeSearchOpen.get(card) ?? card.open;
      }
    });
    if (!query) beforeSearchOpen = undefined;
    categoriesGrid.querySelectorAll<HTMLElement>('.attr-scope-group').forEach((group) => {
      group.hidden = !Array.from(group.querySelectorAll<HTMLDetailsElement>('.attr-category-accordion'))
        .some((card) => !card.hidden);
    });
    scopeButtons.forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.scope === activeScope));
    });
    emptyState.hidden = hasMatches;
  }

  scopeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      activeScope = button.dataset.scope as typeof activeScope;
      filterAttributes();
    });
  });
  searchInput.addEventListener('input', filterAttributes);

  // Apply bulk actions to the categories currently shown by the filters.
  function setVisibleCategoriesOpen(open: boolean): void {
    cards.filter((card) => !card.hidden).forEach((card) => {
      card.open = open;
      beforeSearchOpen?.set(card, open);
    });
  }

  attributesSection
    .querySelector('#btn-expand-all-attrs')
    ?.addEventListener('click', () => {
      setVisibleCategoriesOpen(true);
    });

  attributesSection
    .querySelector('#btn-collapse-all-attrs')
    ?.addEventListener('click', () => {
      setVisibleCategoriesOpen(false);
    });

  attributesSection
    .querySelector('#btn-reset-default-attrs')
    ?.addEventListener('click', onResetDefault);

  wireSectionInfoTooltips(attributesSection);
  if (conditionalRows.size) filterAttributes();

  return {
    element: attributesSection,
    syncAllControls: () => {
      controlSyncCallbacks.forEach((syncFn) => syncFn());
      if (conditionalRows.size) filterAttributes();
    }
  };
}
