const PLACEHOLDER = /\{\{\s*([\p{ID_Continue}\p{Join_Control}$._-]+)\s*\}\}/gu;

export function replaceTemplatePlaceholders(
  template: string,
  resolve: (name: string) => string
): string {
  return template.replace(PLACEHOLDER, (_, name: string) => resolve(name));
}
