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
import { escapeHtml } from '../../guides/shared';
import { getByPath, setByPath } from '../../utils/object-path';

export interface AttributePanelHandle {
  element: HTMLElement;
  syncAllControls: () => void;
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
}): AttributePanelHandle {
  const { entry, config, vState, allAttributes, onConfigChanged } = opts;
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
      <h2 class="panel-title">Attributes &amp; Config</h2>
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

  function getAttributeValue(spec: ChartAttributeSpec): any {
    if (spec.configPath.startsWith('__')) {
      return (vState as any)[spec.configPath] ?? spec.defaultValue;
    }
    const val = getByPath(config, spec.configPath);
    return val !== undefined ? val : spec.defaultValue;
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
    } else {
      setByPath(config, spec.configPath, rawVal);
    }

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

    const cleanCatTitle = categoryName === 'Chart-Specific'
      ? 'Chart options'
      : categoryName.replace(/\s*\(<mc-[^>]+>\)/g, '');
    catDetails.innerHTML = `
      <summary class="attr-category-summary">
        <div class="attr-category-summary-left">
          <span class="attr-chevron" aria-hidden="true">▸</span>
          <span class="attr-category-name">${escapeHtml(cleanCatTitle)}</span>
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
      row.dataset.searchText =
        `${spec.configPath} ${spec.attrName} ${spec.description} ${spec.category}`.toLowerCase();

      const cleanAttrBadge = spec.attrName
        .replace(/\s*\/\s*mc-[a-z-]+\[[^\]]+\]/g, '')
        .replace(/^mc-[a-z-]+\[([^\]]+)\]$/, '$1');
      const metaDiv = document.createElement('div');
      metaDiv.className = 'attr-meta';
      metaDiv.innerHTML = `
        <div class="attr-names">
          <span class="attr-config-path">${escapeHtml(
            spec.configPath.startsWith('__')
              ? spec.configPath.replace('__', '')
              : spec.configPath
          )}</span>
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
          const parsed = raw === '' ? 'auto' : Number(raw);
          setAttributeValue(
            spec,
            Number.isNaN(parsed as number) ? 'auto' : parsed
          );
        });

        controlSyncCallbacks.set(spec.configPath, () => {
          const v = getAttributeValue(spec);
          input.value = v === 'auto' || v === undefined ? '' : String(v);
        });

        controlCell.appendChild(input);
      } else if (spec.control === 'select') {
        const select = document.createElement('select');
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

        controlSyncCallbacks.set(spec.configPath, () => {
          const v = String(getAttributeValue(spec));
          select.value = v;
        });

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
        const matches = scopeMatches && (!query || (row.dataset.searchText ?? '').includes(query));
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

  return {
    element: attributesSection,
    syncAllControls: () => {
      controlSyncCallbacks.forEach((syncFn) => syncFn());
    }
  };
}
