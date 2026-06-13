/**
 * Vendored preact + htm bundle entrypoint. UI imports html/render/hooks ONLY from here,
 * so vendor file paths/versions are changeable in one place.
 * preact@10.29.2, htm@3.1.1
 */
import { h, render } from './preact.module.js';
import { useState, useEffect, useRef } from './hooks.module.js';
import htm from './htm.module.js';
/** Tagged-template html`` bound to preact's h() – use instead of JSX. */
export const html = htm.bind(h);
export { render, useState, useEffect, useRef, h };
