import type { FillRule, SvgFillDef } from '../core/types';

/**
 * Declarative `<mc-def>` child Web Component for defining SVG patterns and gradients
 * directly inside any `<mc-*-chart>` element.
 *
 * Example:
 * ```html
 * <mc-bar-chart>
 *   <mc-def id="stripes" type="lines" match="Cloud" background="inherit" rotation="-45"></mc-def>
 *   <mc-def id="grad" type="linearGradient" match="Edge" colors="#06b6d4,#6366f1"></mc-def>
 * </mc-bar-chart>
 * ```
 */
export class MCDefElement extends HTMLElement {
  static observedAttributes = [
    'id',
    'def-id',
    'type',
    'match',
    'background',
    'color',
    'colors',
    'size',
    'padding',
    'stagger',
    'rotation',
    'line-width',
    'spacing',
    'opacity',
    'angle',
    'width',
    'height'
  ];

  connectedCallback(): void {
    this.style.display = 'none';
  }

  attributeChangedCallback(
    _name: string,
    oldVal: string | null,
    newVal: string | null
  ): void {
    if (oldVal === newVal) return;
    this.dispatchEvent(
      new CustomEvent('mc-layer-change', { bubbles: true, composed: true })
    );
  }

  #numAttr(name: string): number | undefined {
    const raw = this.getAttribute(name);
    if (raw === null || raw === '') return undefined;
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  }

  public toFillDef(): SvgFillDef | null {
    const id = this.getAttribute('def-id') || this.getAttribute('id');
    const type = (this.getAttribute('type') || 'lines').trim();
    if (!id) return null;

    if (type === 'linearGradient' || type === 'radialGradient') {
      const rawColors = this.getAttribute('colors');
      const colors = rawColors
        ? rawColors
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;
      if (type === 'linearGradient') {
        return {
          id,
          type: 'linearGradient',
          colors,
          angle: this.#numAttr('angle')
        };
      }
      return {
        id,
        type: 'radialGradient',
        colors
      };
    }

    if (type === 'custom') {
      return {
        id,
        type: 'custom',
        width: this.#numAttr('width'),
        height: this.#numAttr('height'),
        svg: this.innerHTML.trim()
      };
    }

    const base = {
      id,
      background: this.getAttribute('background') ?? undefined,
      color: this.getAttribute('color') ?? undefined,
      opacity: this.#numAttr('opacity')
    };

    if (type === 'dots') {
      return {
        ...base,
        type: 'dots',
        size: this.#numAttr('size'),
        padding: this.#numAttr('padding'),
        stagger: this.hasAttribute('stagger') && this.getAttribute('stagger') !== 'false'
      };
    }
    if (type === 'squares') {
      return {
        ...base,
        type: 'squares',
        size: this.#numAttr('size'),
        padding: this.#numAttr('padding'),
        stagger: this.hasAttribute('stagger') && this.getAttribute('stagger') !== 'false'
      };
    }
    if (type === 'crosshatch') {
      return {
        ...base,
        type: 'crosshatch',
        rotation: this.#numAttr('rotation'),
        lineWidth: this.#numAttr('line-width'),
        spacing: this.#numAttr('spacing')
      };
    }
    return {
      ...base,
      type: 'lines',
      rotation: this.#numAttr('rotation'),
      lineWidth: this.#numAttr('line-width'),
      spacing: this.#numAttr('spacing')
    };
  }

  public toFillRule(): FillRule | null {
    const id = this.getAttribute('def-id') || this.getAttribute('id');
    const match = this.getAttribute('match');
    if (!id || !match) return null;
    return { match: match.trim(), id };
  }
}
