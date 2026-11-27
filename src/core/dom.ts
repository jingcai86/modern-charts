// Let server code import the package without providing browser globals.
// Custom elements still use the native class when loaded in the browser.
export const HTMLElementBase: typeof HTMLElement =
  typeof HTMLElement !== 'undefined'
    ? HTMLElement
    : class {
        constructor() {
          throw new Error('modern-charts elements require a browser DOM.');
        }
      } as unknown as typeof HTMLElement;

/** Registers a browser custom element once. Safe to call during server rendering. */
export function defineCustomElement(tag: string, ctor: CustomElementConstructor): void {
  if (
    typeof document === 'undefined' ||
    typeof HTMLElement === 'undefined' ||
    typeof customElements === 'undefined'
  ) return;
  if (!customElements.get(tag)) customElements.define(tag, ctor);
}

export function registerComponentDefinitions(components: Record<string, CustomElementConstructor>): void {
  for (const [tag, ctor] of Object.entries(components)) defineCustomElement(tag, ctor);
}

/** Creates and caches the template the first time a browser element needs it. */
export function lazyTemplate(markup: string): () => HTMLTemplateElement {
  let template: HTMLTemplateElement | undefined;
  return () => {
    if (!template) {
      template = document.createElement('template');
      template.innerHTML = markup;
    }
    return template;
  };
}
