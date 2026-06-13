/**
 * Ambient global declarations for Node 17+ / modern browser APIs not in lib ES2022.
 * structuredClone is globally available in Node 17+ and all modern browsers.
 * Declared here to avoid needing "DOM" lib while keeping the no-DOM typecheck invariant (§1.3).
 */
declare function structuredClone<T>(value: T, options?: { transfer?: ArrayBuffer[] }): T;
