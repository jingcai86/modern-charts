/**
 * Safe nested dotted-path helpers (e.g. 'yScale.max', 'legend.padding.top')
 * with prototype-pollution guards.
 */

export function isUnsafePathKey(key: string): boolean {
  return key === '__proto__' || key === 'constructor' || key === 'prototype';
}

export function getByPath(obj: any, path: string): any {
  return path.split('.').reduce((acc, part) => {
    if (
      acc == null ||
      isUnsafePathKey(part) ||
      !Object.prototype.hasOwnProperty.call(acc, part)
    ) {
      return undefined;
    }
    return acc[part];
  }, obj);
}

export function setByPath(obj: any, path: string, value: any): void {
  if (!obj || typeof obj !== 'object') return;
  const parts = path.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (isUnsafePathKey(key)) {
      return;
    }
    if (
      !Object.prototype.hasOwnProperty.call(cur, key) ||
      cur[key] == null ||
      typeof cur[key] !== 'object'
    ) {
      cur[key] = {};
    } else {
      cur[key] = { ...cur[key] };
    }
    cur = cur[key];
  }
  const lastKey = parts[parts.length - 1];
  if (isUnsafePathKey(lastKey)) {
    return;
  }
  cur[lastKey] = value;
}
