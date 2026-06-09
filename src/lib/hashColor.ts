/**
 * Deterministic entity color: FNV-1a hash of the id -> hue.
 * Saturation/lightness are fixed, tuned to read well on the warm dark theme
 * with a white glyph on top ("color = personality, glyph = role").
 */
export function hashColor(id: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  const hue = (h >>> 0) % 360
  return `hsl(${hue} 42% 40%)`
}
