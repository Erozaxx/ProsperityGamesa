/**
 * Build-free environment flags for the app/ui layer.
 * Core's freeze.js exports its own DEV=true (iter-004). This module is the app-side switch;
 * UI uses APP_DEV to decide whether to enable dev-mode features.
 * @type {boolean}
 */
export const APP_DEV = true; // M0b: hardcoded true; later toggled via served env (e.g. ?prod or build var)
