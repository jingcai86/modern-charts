import {
  registerSelectionEngine,
  type SelectableItemEntry,
  type SelectionEngineImplementation,
  type SelectionHostAdapter
} from './features';
import type {
  ChartEventTargetKind,
  ResolvedSelectionConfig,
  SelectedChartItem,
  SelectionAction,
  SelectionChangeDetail,
  SelectionMode
} from './types';

export function normalizeSelectionMode(raw: unknown): SelectionMode {
  return raw === 'multiple' || raw === 'multi' ? 'multiple' : 'single';
}

function buildSelectedItem(
  chartType: string,
  record: SelectableItemEntry
): SelectedChartItem {
  const { id, element, ariaItem, eventReg } = record;
  const regData =
    eventReg?.data && typeof eventReg.data === 'object'
      ? { ...(eventReg.data as Record<string, any>) }
      : {};
  const ariaDatum =
    ariaItem?.datum && typeof ariaItem.datum === 'object'
      ? { ...(ariaItem.datum as Record<string, any>) }
      : {};

  const row =
    regData.row ??
    regData.rowId ??
    ariaDatum.row ??
    ariaDatum.rowId ??
    (chartType === 'heatmap' ? ariaItem?.seriesId : undefined);
  const column =
    regData.column ??
    regData.colId ??
    ariaDatum.column ??
    ariaDatum.colId ??
    (chartType === 'heatmap' ? ariaItem?.category : undefined);
  const value = regData.value !== undefined ? regData.value : ariaItem?.value;

  const label =
    ariaItem?.label ??
    regData.label ??
    regData.name ??
    id;
  const seriesId = ariaItem?.seriesId ?? regData.seriesId ?? regData.key;
  const category =
    ariaItem?.category ?? regData.category ?? regData.indexValue ?? regData.axis;
  const index = ariaItem?.index ?? regData.index ?? 0;
  const color = ariaItem?.color ?? regData.color;
  const target: ChartEventTargetKind =
    (eventReg?.target as ChartEventTargetKind) ?? 'item';

  const data: Record<string, any> = {
    id,
    ...ariaDatum,
    ...regData,
    label,
    ...(value !== undefined ? { value } : {}),
    ...(seriesId !== undefined ? { seriesId } : {}),
    ...(category !== undefined ? { category } : {}),
    ...(row !== undefined ? { row: String(row), rowId: String(row) } : {}),
    ...(column !== undefined ? { column: String(column), colId: String(column) } : {})
  };

  return {
    id,
    chartType,
    target,
    ...(ariaItem?.type ? { type: ariaItem.type } : {}),
    label: String(label),
    ...(value !== undefined ? { value } : {}),
    ...(ariaItem?.formattedValue !== undefined
      ? { formattedValue: ariaItem.formattedValue }
      : {}),
    ...(seriesId !== undefined ? { seriesId: String(seriesId) } : {}),
    ...(category !== undefined ? { category: String(category) } : {}),
    ...(row !== undefined ? { row: String(row), rowId: String(row) } : {}),
    ...(column !== undefined
      ? { column: String(column), colId: String(column) }
      : {}),
    ...(ariaItem?.source !== undefined ? { source: ariaItem.source } : {}),
    ...(ariaItem?.target !== undefined ? { targetNode: ariaItem.target } : {}),
    index: Number(index),
    ...(color !== undefined ? { color: String(color) } : {}),
    data,
    datum: regData.datum ?? (Object.keys(ariaDatum).length > 0 ? ariaDatum : data),
    element
  };
}

function syncDomState(
  adapter: SelectionHostAdapter,
  selCfg: ResolvedSelectionConfig
): void {
  const svg = adapter.shadowRoot?.querySelector<SVGSVGElement>('.mc-chart-svg');
  const container =
    adapter.shadowRoot?.querySelector<HTMLElement>('.mc-chart-container');
  const isEnabled = selCfg.enabled;
  const selectedSet = new Set(isEnabled ? adapter.selectedIds : []);
  const hasSelection = isEnabled && selectedSet.size > 0;

  if (svg) {
    if (hasSelection) svg.setAttribute('data-has-selection', 'true');
    else svg.removeAttribute('data-has-selection');
    if (isEnabled) svg.setAttribute('data-selection-mode', selCfg.mode);
    else svg.removeAttribute('data-selection-mode');
  }
  if (container) {
    if (hasSelection) container.setAttribute('data-has-selection', 'true');
    else container.removeAttribute('data-has-selection');
  }

  for (const [id, rec] of adapter.records) {
    const el = rec.element;
    const isSelected = isEnabled && selectedSet.has(id);
    if (isEnabled) {
      el.setAttribute('data-selectable', 'true');
      el.setAttribute('data-selection-id', id);
      el.setAttribute('aria-selected', String(isSelected));
    } else {
      el.removeAttribute('data-selectable');
      el.removeAttribute('data-selection-id');
      el.removeAttribute('aria-selected');
    }
    if (isSelected) {
      el.setAttribute('data-selected', 'true');
      el.classList.add('mc-item--selected');
    } else {
      el.removeAttribute('data-selected');
      el.classList.remove('mc-item--selected');
    }
  }
}

function commitSelection(
  adapter: SelectionHostAdapter,
  nextIds: string[],
  action: SelectionAction,
  source: 'pointer' | 'keyboard' | 'api',
  changedId?: string,
  silent = false
): SelectedChartItem[] {
  const selCfg = adapter.resolveConfig();
  if (!selCfg.enabled) return [];

  const prevKey = adapter.selectedIds.join('\0');
  const nextKey = nextIds.join('\0');
  adapter.selectedIds = nextIds;
  adapter.onSyncIds(nextIds);
  syncDomState(adapter, selCfg);

  const selectedItems = nextIds
    .map((id) => adapter.records.get(id))
    .filter((r): r is SelectableItemEntry => Boolean(r))
    .map((r) => buildSelectedItem(adapter.chartType, r));

  if (!silent && prevKey !== nextKey) {
    const changedRec = changedId ? adapter.records.get(changedId) : undefined;
    const detail: SelectionChangeDetail = {
      selectedItems,
      selectedIds: selectedItems.map((it) => it.id),
      ...(changedRec
        ? { item: buildSelectedItem(adapter.chartType, changedRec) }
        : {}),
      action,
      mode: selCfg.mode,
      chartType: adapter.chartType,
      source
    };
    selCfg.onChange?.(detail);
    adapter.host.dispatchEvent(
      new CustomEvent<SelectionChangeDetail>('mc-selection-change', {
        bubbles: true,
        composed: true,
        detail
      })
    );
  }
  return selectedItems;
}

export const selectionEngineImpl: SelectionEngineImplementation = {
  getSelectedItems(adapter) {
    if (!adapter.resolveConfig().enabled) return [];
    return adapter.selectedIds
      .map((id) => adapter.records.get(id))
      .filter((r): r is SelectableItemEntry => Boolean(r))
      .map((r) => buildSelectedItem(adapter.chartType, r));
  },

  finalizeRender(adapter) {
    const hasPoints = Array.from(adapter.records.values()).some(
      (r) => r.ariaItem?.type === 'point' || r.ariaItem?.type === 'radar-point'
    );
    if (hasPoints) {
      for (const [id, r] of adapter.records) {
        if (!r.ariaItem) adapter.records.delete(id);
      }
    }
    const selCfg = adapter.resolveConfig();
    const sourceIds = Array.isArray(selCfg.selectedIds)
      ? selCfg.selectedIds
      : adapter.selectedIds;
    let valid = sourceIds.filter((id) => adapter.records.has(id));
    if (selCfg.mode === 'single' && valid.length > 1) {
      valid = [valid[valid.length - 1]];
    }
    adapter.selectedIds = valid;
    syncDomState(adapter, selCfg);
    return selCfg.enabled && valid.length > 0;
  },

  mutate(adapter, kind, ids, options = {}) {
    const selCfg = adapter.resolveConfig();
    if (!selCfg.enabled) {
      if (kind === 'clear') adapter.selectedIds = [];
      return [];
    }
    const mode = options.mode ?? selCfg.mode;
    const current = adapter.selectedIds;

    if (kind === 'clear') {
      if (current.length === 0) return [];
      return commitSelection(
        adapter,
        [],
        'clear',
        options.source ?? 'api',
        undefined,
        options.silent
      );
    }

    const list = (Array.isArray(ids) ? ids : ids ? [ids] : []).filter((id) =>
      adapter.records.has(id)
    );
    if (kind === 'set') {
      const dedup = Array.from(new Set(list));
      const next = mode === 'single' && dedup.length > 1 ? [dedup[dedup.length - 1]] : dedup;
      return commitSelection(
        adapter,
        next,
        next.length === 0 ? 'clear' : 'set',
        'api',
        next[next.length - 1],
        options.silent
      );
    }

    if (list.length === 0) return this.getSelectedItems(adapter);
    const lastId = list[list.length - 1];

    if (kind === 'select') {
      const next =
        mode === 'single'
          ? [lastId]
          : Array.from(new Set([...current, ...list]));
      return commitSelection(adapter, next, 'select', 'api', lastId, options.silent);
    }

    if (kind === 'deselect') {
      const removeSet = new Set(list);
      const next = current.filter((id) => !removeSet.has(id));
      return commitSelection(adapter, next, 'deselect', 'api', list[0], options.silent);
    }

    // toggle
    const exists = current.includes(lastId);
    const next =
      mode === 'single'
        ? exists && current.length === 1
          ? []
          : [lastId]
        : exists
        ? current.filter((id) => id !== lastId)
        : [...current, lastId];
    return commitSelection(
      adapter,
      next,
      exists ? 'deselect' : 'select',
      'api',
      lastId,
      options.silent
    );
  },

  handleClick(adapter, ev, isKeyboard) {
    const selCfg = adapter.resolveConfig();
    if (!selCfg.enabled) return;

    const findIdFromEl = (start: Element | null | undefined): string | undefined => {
      const svg = adapter.shadowRoot?.querySelector('.mc-chart-svg');
      let cur: Element | null = start ?? null;
      while (cur && cur !== svg) {
        const id =
          cur.getAttribute('data-selection-id') ??
          cur.getAttribute('data-aria-id');
        if (id && adapter.records.has(id)) return id;
        cur = cur.parentElement;
      }
      return undefined;
    };

    const rawTarget = ev.nativeEvent?.target as Element | null;
    let targetId = findIdFromEl(rawTarget) ?? findIdFromEl(ev.element);

    if (!targetId && (ev.category === 'item' || rawTarget?.classList?.contains('mc-scatter-mesh'))) {
      if (ev.targetId && adapter.records.has(ev.targetId)) {
        targetId = ev.targetId;
      } else if (ev.target === 'gaugeNeedle') {
        targetId = adapter.records.keys().next().value;
      } else {
        const sliceIdx =
          ev.target === 'lineSlice' && typeof ev.data?.index === 'number'
            ? ev.data.index
            : undefined;
        const seriesId =
          ev.target === 'lineSeries' || ev.target === 'radarPolygon'
            ? ev.targetId
            : undefined;
        let bestD = Infinity;
        for (const [id, rec] of adapter.records) {
          const d = rec.eventReg?.data as Record<string, any> | undefined;
          if (sliceIdx !== undefined && d?.pointIndex !== undefined && d.pointIndex !== sliceIdx) continue;
          if (seriesId && rec.ariaItem?.seriesId && rec.ariaItem.seriesId !== seriesId) continue;
          const a = rec.ariaItem?.anchor;
          const px = d?.position?.x ?? (a ? a.left - adapter.margin.left + a.width / 2 : Number(rec.element.getAttribute('cx')));
          const py = d?.position?.y ?? (a ? a.top - adapter.margin.top + a.height / 2 : Number(rec.element.getAttribute('cy')));
          const dist = Number.isFinite(px) && Number.isFinite(py) ? (px - ev.chartX) ** 2 + (py - ev.chartY) ** 2 : 0;
          if (dist < bestD) {
            bestD = dist;
            targetId = id;
          }
        }
      }
    }

    if (!targetId || !adapter.records.has(targetId)) return;
    const current = adapter.selectedIds;
    const exists = current.includes(targetId);
    const next =
      selCfg.mode === 'single'
        ? exists && current.length === 1
          ? []
          : [targetId]
        : exists
        ? current.filter((id) => id !== targetId)
        : [...current, targetId];
    commitSelection(
      adapter,
      next,
      exists ? 'deselect' : 'select',
      isKeyboard ? 'keyboard' : 'pointer',
      targetId,
      false
    );
  }
};

registerSelectionEngine(selectionEngineImpl);
