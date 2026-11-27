// Evaluated inside QuickJS. The browser only receives serialized preview instructions.
export const GUEST_SOURCE = String.raw`
function runPreviewCallback(inputJson, makeCallback) {
  const host = globalThis.__host;
  delete globalThis.__host;
  const input = JSON.parse(inputJson);
  const rpc = (name, ...args) => JSON.parse(host(name, JSON.stringify(args)));
  const listeners = [];
  const actions = [];
  const svgNamespace = 'http://www.w3.org/2000/svg';

  class VirtualElement {
    constructor(tag, namespace) {
      this.kind = 'node';
      this.tag = String(tag);
      this.namespace = namespace;
      this.attributes = Object.create(null);
      this.style = Object.create(null);
      this.children = [];
      this.events = [];
      Object.defineProperty(this.style, 'setProperty', {
        value(name, value) { this[String(name)] = String(value); }
      });
    }

    setAttribute(name, value) { this.attributes[String(name)] = String(value); }
    getAttribute(name) { return this.attributes[name] ?? null; }
    removeAttribute(name) { delete this.attributes[name]; }

    set textContent(value) {
      this.children.length = 0;
      this.text = value == null ? '' : String(value);
    }

    get textContent() { return this.text ?? ''; }

    appendChild(child) {
      this.children.push(child);
      return child;
    }

    append(...children) { children.forEach((child) => this.appendChild(child)); }
  }

  const document = {
    createElement: (tag) => new VirtualElement(tag, 'html'),
    createElementNS: (namespace, tag) => new VirtualElement(tag, namespace === svgNamespace ? 'svg' : 'html')
  };

  function registerListener(node, type, listener, datum) {
    if (typeof listener !== 'function') return;
    const index = listeners.push({ listener, node, type, datum }) - 1;
    node.events.push({ type, index });
  }

  function selection(node) {
    let datum;
    const resolve = (value) => typeof value === 'function' ? value.call(node, datum, 0, [node]) : value;
    return {
      append(tag) {
        const name = String(tag);
        return selection(node.appendChild(new VirtualElement(name.replace(/^svg:/, ''),
          name.startsWith('svg:') ? 'svg' : node.namespace)));
      },
      datum(value) { datum = value; return this; },
      attr(name, value) {
        const next = resolve(value);
        if (next == null) node.removeAttribute(name);
        else node.setAttribute(name, next);
        return this;
      },
      style(name, value) { node.style.setProperty(name, resolve(value)); return this; },
      text(value) { node.textContent = resolve(value); return this; },
      on(type, listener) { registerListener(node, String(type), listener, datum); return this; },
      node() { return node; }
    };
  }

  function pathGenerator(kind, accessors) {
    let curve = 'curveLinear';
    const generator = (data) => rpc(kind, Array.from(data, (point, index) =>
      Object.values(accessors).map((accessor) => typeof accessor === 'function'
        ? accessor(point, index, data)
        : accessor)), curve);
    for (const key of Object.keys(accessors)) {
      generator[key] = (accessor) => { accessors[key] = accessor; return generator; };
    }
    generator.curve = (nextCurve) => { curve = nextCurve; return generator; };
    return generator;
  }

  function numbers(values, accessor) {
    return Array.from(values, (value, index) => accessor ? accessor(value, index, values) : value)
      .filter((value) => value != null)
      .map(Number)
      .filter(Number.isFinite);
  }

  const d3 = {
    select: selection,
    area: () => pathGenerator('areaPath', { x: (point) => point[0], y0: 0, y1: (point) => point[1] }),
    line: () => pathGenerator('linePath', { x: (point) => point[0], y: (point) => point[1] }),
    curveLinear: 'curveLinear',
    curveMonotoneX: 'curveMonotoneX',
    mean: (values, accessor) => rpc('mean', numbers(values, accessor)),
    quantile: (values, probability, accessor) => rpc('quantile', numbers(values, accessor), probability),
    ascending: (a, b) => a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN,
    format: (format) => (value) => rpc('format', format, value)
  };

  const bindings = Object.create(null);
  for (const [name, value] of Object.entries(input.bindings ?? {})) {
    if (value?.$mcBinding === 'prepareWithSegments') bindings[name] = (text, font) => ({ text, font });
    else if (value?.$mcBinding === 'layoutWithLines') bindings[name] = (...args) => rpc('layoutWithLines', ...args);
    else bindings[name] = value;
  }

  const args = input.args;
  if (typeof input.defaultRenderIndex === 'number') args[input.defaultRenderIndex] = () => ({ kind: 'default' });
  let layerGroup;
  if (input.chart) {
    const index = input.chart === true ? 0 : input.chart.index;
    layerGroup = new VirtualElement('g', 'svg');
    args[index] = {
      ...args[index], d3, layerGroup,
      xScale: input.chart.xScale === false ? undefined : (value) => rpc('xScale', value),
      yScale: input.chart.yScale === false ? undefined : (value) => rpc('yScale', value),
      renderLabel: (parent, descriptor) => parent.appendChild({ kind: 'label', descriptor }),
      showTooltip: (html, x, y) => actions.push({ kind: 'show', html: String(html), x, y }),
      hideTooltip: () => actions.push({ kind: 'hide' })
    };
  }

  const callback = makeCallback(document, bindings);
  const value = callback(...args);
  if (!input.event) return JSON.stringify({ value, layer: layerGroup, actions });

  actions.length = 0;
  const match = listeners[input.event.index];
  if (match) {
    const { listener, node, type, datum } = match;
    listener.call(node, { ...input.event.data, type }, datum);
  }
  return JSON.stringify({ actions });
}
`;
