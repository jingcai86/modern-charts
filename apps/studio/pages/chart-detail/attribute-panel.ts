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
  const categories = Array.from(new Set(allAttributes.map((a) => a.category)));

  const attributesSection = document.createElement('div');
  attributesSection.className = 'panel-card attributes-panel-card';
  attributesSection.innerHTML = `
    <div class="attributes-section-header">
      <div>
        <h2 class="panel-title">
          All Customizable Attributes &amp; Config Properties (${allAttributes.length})
        </h2>
        <p style="margin:4px 0 0;font-size:0.82rem;color:var(--text-muted);">
          Click any category header to expand or minimize it. Change any control below to see it reflect on the live chart and in <code>chart.config</code> immediately.
        </p>
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
        />
      </div>
    </div>
    <div class="attributes-accordion-list" id="attributes-categories-grid"></div>
  `;

  const categoriesGrid = attributesSection.querySelector(
    '#attributes-categories-grid'
  ) as HTMLElement;

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
    } else if (spec.configPath === 'tooltip.position' && rawVal === '') {
      if (config.tooltip && typeof config.tooltip === 'object') {
        delete config.tooltip.position;
      }
    } else {
      setByPath(config, spec.configPath, rawVal);
    }

    onConfigChanged();
  }

  categories.forEach((categoryName, catIdx) => {
    const specsInCat = allAttributes.filter((a) => a.category === categoryName);
    const catDetails = document.createElement('details');
    catDetails.className = 'attr-category-accordion';
    catDetails.dataset.category = categoryName;
    if (catIdx === 0) {
      catDetails.open = true;
    }

    const cleanCatTitle = categoryName.replace(/\s*\(<mc-[^>]+>\)/g, '');
    catDetails.innerHTML = `
      <summary class="attr-category-summary">
        <div class="attr-category-summary-left">
          <span class="attr-chevron" aria-hidden="true">▸</span>
          <span class="attr-category-name">${cleanCatTitle}</span>
        </div>
        <span class="comp-pill">${specsInCat.length}</span>
      </summary>
      <div class="attr-list"></div>
    `;

    const attrList = catDetails.querySelector('.attr-list') as HTMLElement;

    specsInCat.forEach((spec) => {
      const row = document.createElement('div');
      row.className = 'attr-row';
      row.dataset.searchText =
        `${spec.configPath} ${spec.attrName} ${spec.description} ${spec.category}`.toLowerCase();

      const cleanAttrBadge = spec.attrName
        .replace(/\s*\/\s*mc-[a-z-]+\[[^\]]+\]/g, '')
        .replace(/^mc-[a-z-]+\[([^\]]+)\]$/, '$1');
      const metaDiv = document.createElement('div');
      metaDiv.className = 'attr-meta';
      metaDiv.innerHTML = `
        <div class="attr-names">
          <span class="attr-config-path">${
            spec.configPath.startsWith('__')
              ? spec.configPath.replace('__', '')
              : spec.configPath
          }</span>
          <span class="attr-html-badge">${cleanAttrBadge}</span>
        </div>
        <p class="attr-desc">${spec.description}</p>
      `;

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
          setAttributeValue(spec, textInput.value);
        });

        controlSyncCallbacks.set(spec.configPath, () => {
          const v = getAttributeValue(spec);
          textInput.value = String(v ?? '');
        });

        controlCell.appendChild(textInput);
      }

      row.appendChild(metaDiv);
      row.appendChild(controlCell);
      attrList.appendChild(row);
    });

    categoriesGrid.appendChild(catDetails);
  });

  // Expand All / Minimize All buttons
  attributesSection
    .querySelector('#btn-expand-all-attrs')
    ?.addEventListener('click', () => {
      categoriesGrid
        .querySelectorAll<HTMLDetailsElement>('.attr-category-accordion')
        .forEach((d) => {
          d.open = true;
        });
    });

  attributesSection
    .querySelector('#btn-collapse-all-attrs')
    ?.addEventListener('click', () => {
      categoriesGrid
        .querySelectorAll<HTMLDetailsElement>('.attr-category-accordion')
        .forEach((d) => {
          d.open = false;
        });
    });

  // Search filter
  const searchInput = attributesSection.querySelector(
    '#attr-search-input'
  ) as HTMLInputElement;
  searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim().toLowerCase();
    const cards = categoriesGrid.querySelectorAll<HTMLDetailsElement>(
      '.attr-category-accordion'
    );
    cards.forEach((card, idx) => {
      const rows = card.querySelectorAll<HTMLElement>('.attr-row');
      let visibleInCard = 0;
      rows.forEach((r) => {
        const match = !q || (r.dataset.searchText ?? '').includes(q);
        r.style.display = match ? '' : 'none';
        if (match) visibleInCard++;
      });
      card.style.display = visibleInCard > 0 ? '' : 'none';
      if (q && visibleInCard > 0) {
        card.open = true;
      } else if (!q) {
        card.open = idx === 0;
      }
    });
  });

  return {
    element: attributesSection,
    syncAllControls: () => {
      controlSyncCallbacks.forEach((syncFn) => syncFn());
    }
  };
}
