import { HTMLElementBase } from '../core/dom';
import { createDefaultAriaConfig } from '../core/aria-engine';
import type {
  AriaConfig,
  AriaItemDescriptor,
  AriaItemLabelAccessor
} from '../core/types';

/**
 * `<mc-aria-layer>` (and `<mc-aria>` alias)
 * Universal Chart Accessibility & Item-Level ARIA Web Component.
 * Ensures every chart and every chart item (bars, line points, pie slices,
 * heatmap cells, radar points, sunburst arcs, sankey nodes/links, scatter bubbles,
 * treemap tiles, and gauge arcs) exposes customizable `aria-label`, `role`,
 * `aria-roledescription`, keyboard tab/arrow focusability, and screen-reader announcements.
 */
export class MCAriaLayer extends HTMLElementBase {
  static observedAttributes = [
    'enabled',
    'role',
    'label',
    'aria-label',
    'labelled-by',
    'described-by',
    'description',
    'is-focusable',
    'announce-on-focus',
    'include-data-table',
    'item-role',
    'item-role-description',
    'item-label',
    'item-description'
  ];

  #itemLabelFn?: AriaItemLabelAccessor;
  #itemDescriptionFn?: AriaItemLabelAccessor;
  #itemRoleFn?: string | ((item: AriaItemDescriptor) => string);
  #itemHiddenFn?: boolean | ((item: AriaItemDescriptor) => boolean);
  #itemAttributesFn?: (
    item: AriaItemDescriptor
  ) => Record<string, string | number | boolean | undefined>;

  constructor() {
    super();
  }

  connectedCallback(): void {
    this.style.display = 'none';
    this.#notifyChange();
  }

  connectedMoveCallback(): void {
    this.#notifyChange();
  }

  disconnectedCallback(): void {
    this.#notifyChange();
  }

  attributeChangedCallback(
    _name: string,
    oldVal: string | null,
    newVal: string | null
  ): void {
    if (oldVal !== newVal) {
      this.#notifyChange();
    }
  }

  get itemLabel(): AriaItemLabelAccessor | undefined {
    return this.#itemLabelFn ?? (this.getAttribute('item-label') || undefined);
  }
  set itemLabel(val: AriaItemLabelAccessor | undefined) {
    this.#itemLabelFn = val;
    this.#notifyChange();
  }

  get itemDescription(): AriaItemLabelAccessor | undefined {
    return (
      this.#itemDescriptionFn ??
      (this.getAttribute('item-description') || undefined)
    );
  }
  set itemDescription(val: AriaItemLabelAccessor | undefined) {
    this.#itemDescriptionFn = val;
    this.#notifyChange();
  }

  get itemRole(): string | ((item: AriaItemDescriptor) => string) | undefined {
    return this.#itemRoleFn ?? (this.getAttribute('item-role') || undefined);
  }
  set itemRole(val: string | ((item: AriaItemDescriptor) => string) | undefined) {
    this.#itemRoleFn = val;
    this.#notifyChange();
  }

  get itemHidden():
    | boolean
    | ((item: AriaItemDescriptor) => boolean)
    | undefined {
    return this.#itemHiddenFn;
  }
  set itemHidden(
    val: boolean | ((item: AriaItemDescriptor) => boolean) | undefined
  ) {
    this.#itemHiddenFn = val;
    this.#notifyChange();
  }

  get itemAttributes():
    | ((
        item: AriaItemDescriptor
      ) => Record<string, string | number | boolean | undefined>)
    | undefined {
    return this.#itemAttributesFn;
  }
  set itemAttributes(
    fn:
      | ((
          item: AriaItemDescriptor
        ) => Record<string, string | number | boolean | undefined>)
      | undefined
  ) {
    this.#itemAttributesFn = fn;
    this.#notifyChange();
  }

  public applyFromConfig(config: Partial<AriaConfig>): void {
    if (config.enabled !== undefined)
      this.setAttribute('enabled', String(config.enabled));
    if (config.role) this.setAttribute('role', config.role);
    if (config.label) this.setAttribute('label', config.label);
    if (config.labelledBy)
      this.setAttribute('labelled-by', config.labelledBy);
    if (config.describedBy)
      this.setAttribute('described-by', config.describedBy);
    if (config.description)
      this.setAttribute('description', config.description);
    if (config.isFocusable !== undefined)
      this.setAttribute('is-focusable', String(config.isFocusable));
    if (config.announceOnFocus !== undefined)
      this.setAttribute('announce-on-focus', String(config.announceOnFocus));
    if (config.includeDataTable !== undefined)
      this.setAttribute('include-data-table', String(config.includeDataTable));
    if (typeof config.itemRole === 'string') {
      this.setAttribute('item-role', config.itemRole);
    } else if (config.itemRole) {
      this.#itemRoleFn = config.itemRole;
    }
    if (typeof config.itemRoleDescription === 'string') {
      this.setAttribute('item-role-description', config.itemRoleDescription);
    }
    if (typeof config.itemLabel === 'string') {
      this.setAttribute('item-label', config.itemLabel);
    } else if (config.itemLabel) {
      this.#itemLabelFn = config.itemLabel;
    }
    if (typeof config.itemDescription === 'string') {
      this.setAttribute('item-description', config.itemDescription);
    } else if (config.itemDescription) {
      this.#itemDescriptionFn = config.itemDescription;
    }
    if (config.itemHidden !== undefined) {
      this.#itemHiddenFn = config.itemHidden;
    }
    if (config.itemAttributes) {
      this.#itemAttributesFn = config.itemAttributes;
    }
  }

  public getAriaConfig(): AriaConfig {
    const base = createDefaultAriaConfig();
    const enabled =
      !this.hasAttribute('enabled') ||
      this.getAttribute('enabled') !== 'false';
    const isFocusable =
      !this.hasAttribute('is-focusable') ||
      this.getAttribute('is-focusable') !== 'false';
    const announceOnFocus =
      !this.hasAttribute('announce-on-focus') ||
      this.getAttribute('announce-on-focus') !== 'false';
    const includeDataTable =
      !this.hasAttribute('include-data-table') ||
      this.getAttribute('include-data-table') !== 'false';

    return {
      ...base,
      enabled,
      role: this.getAttribute('role') || base.role,
      label:
        this.getAttribute('label') ||
        this.getAttribute('aria-label') ||
        undefined,
      labelledBy: this.getAttribute('labelled-by') || undefined,
      describedBy: this.getAttribute('described-by') || undefined,
      description: this.getAttribute('description') || undefined,
      isFocusable,
      announceOnFocus,
      includeDataTable,
      itemRole:
        this.#itemRoleFn || this.getAttribute('item-role') || base.itemRole,
      itemRoleDescription:
        this.getAttribute('item-role-description') || undefined,
      itemLabel:
        this.#itemLabelFn || this.getAttribute('item-label') || undefined,
      itemDescription:
        this.#itemDescriptionFn ||
        this.getAttribute('item-description') ||
        undefined,
      itemHidden: this.#itemHiddenFn,
      itemAttributes: this.#itemAttributesFn
    };
  }

  #notifyChange(): void {
    this.dispatchEvent(
      new CustomEvent('mc-layer-change', {
        bubbles: true,
        composed: true,
        detail: { source: 'mc-aria-layer', element: this }
      })
    );
  }
}
