/**
 * Command dispatch layer – single UI→core entry point.
 * Separate from fns registry: commands return CommandResult; handlers mutate state in tick.
 */

/**
 * @typedef {import('../state/types.js').GameState} GameState
 */

/**
 * @typedef {{ type: string, params?: Record<string, unknown> }} Command
 * @typedef {{ ok: boolean, error?: string }} CommandResult
 * @typedef {(state: GameState, params: Record<string, unknown>) => CommandResult} CommandHandlerFn
 * @typedef {{ handlers: Map<string, CommandHandlerFn> }} CommandRegistry
 */

/**
 * Creates an empty command registry.
 * @returns {CommandRegistry}
 */
export function createCommandRegistry() {
  return { handlers: new Map() };
}

/**
 * Registers a command handler.
 * @param {CommandRegistry} creg
 * @param {string} type
 * @param {CommandHandlerFn} handler
 * @returns {void}
 */
export function registerCommand(creg, type, handler) {
  creg.handlers.set(type, handler);
}

/**
 * Dispatches a command. Never throws – unknown type returns {ok:false, error:...}.
 * Validates params serializability before dispatching.
 * @param {CommandRegistry} creg
 * @param {GameState} state
 * @param {Command} cmd
 * @returns {CommandResult}
 */
export function dispatch(creg, state, cmd) {
  const params = cmd.params ?? {};
  // Validate serializability (non-throwing check)
  try {
    structuredClone(params);
  } catch (e) {
    return { ok: false, error: `command params not serializable: ${String(e)}` };
  }

  const handler = creg.handlers.get(cmd.type);
  if (!handler) {
    // DEV: warn (no console.warn here to stay clean; caller can check ok:false)
    return { ok: false, error: `unknown command: ${cmd.type}` };
  }

  return handler(state, params);
}
