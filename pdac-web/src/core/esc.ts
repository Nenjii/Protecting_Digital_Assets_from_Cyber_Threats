// HTML escaping, kept on its own so it can be reused without pulling in the
// data layer (src/core/data.ts bundles every answer file). The Module 5 LAN
// game (range/) reuses NetMap, which needs esc() but must not ship the answers.

/** Escape text before it goes into innerHTML. */
export function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Escaped text with **bold** allowed (for reasons and explanations). */
export function md(value: unknown): string {
  return esc(value).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
}
