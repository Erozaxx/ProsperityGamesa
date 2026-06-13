/**
 * Council state factory and helpers. iter-010 M4a.
 */

/**
 * @param {number} month
 * @param {number} year
 * @returns {{ month: number, year: number, goldEarned: number, goldSpent: number, byCause: Record<string,number>, consumed: Record<string,number>, produced: Record<string,number> }}
 */
export function emptyReport(month, year) {
  return { month, year, goldEarned: 0, goldSpent: 0, byCause: {}, consumed: {}, produced: {} };
}

/**
 * @returns {{ current: ReturnType<typeof emptyReport>, history: Array<ReturnType<typeof emptyReport>> }}
 */
export function createCouncilState() {
  return {
    current: emptyReport(1, 1),
    history: [],
  };
}
