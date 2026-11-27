const itemDefinitions = new WeakMap<SVGGElement, Set<Element>>();

/** Keep references to definitions painted by this mark before the next render. */
export function captureItemDefinitions(group: SVGGElement): void {
  itemDefinitions.delete(group);
  const mark = group.firstElementChild;
  if (!mark || (mark.localName !== 'g' && !mark.getAttribute('fill')?.startsWith('url(#'))) return;
  const root = group.getRootNode() as Document | ShadowRoot;
  if (typeof root.getElementById !== 'function') return;
  const parts = mark.localName === 'g' ? Array.from(mark.children) : [mark];
  const definitions = new Set<Element>();
  for (const part of parts) {
    for (const attribute of ['fill', 'clip-path']) {
      const reference = part.getAttribute(attribute);
      if (!reference?.startsWith('url(#') || !reference.endsWith(')')) continue;
      const definition = root.getElementById(reference.slice(5, -1));
      if (definition?.parentElement?.classList.contains('mc-chart-defs')) definitions.add(definition);
    }
  }
  if (definitions.size > 0) itemDefinitions.set(group, definitions);
}

/** Move detached definitions to the outgoing group for the duration of its fade. */
export function retainItemDefinitions(group: SVGGElement): void {
  const definitions = itemDefinitions.get(group);
  if (!definitions) return;
  const root = group.getRootNode() as Document | ShadowRoot;
  if (typeof root.getElementById !== 'function') return;
  const missing = [...definitions].filter(definition => !root.getElementById(definition.id));
  if (missing.length === 0) return;
  const defs = group.ownerDocument.createElementNS(group.namespaceURI, 'defs');
  defs.append(...missing);
  group.prepend(defs);
}
