import type { GlyphKey } from '../types/ui'
import { hashColor } from '../lib/hashColor'
import { Glyph } from './glyphs'

/** Approved tile shape: heraldic shield (previz decision "tile-shield"). */
const SHIELD_CLIP = 'polygon(50% 0, 100% 18%, 100% 62%, 50% 100%, 0 62%, 0 18%)'

interface TileProps {
  /** Entity id; the tile color is derived from its hash ("color = personality"). */
  entityId: string
  glyph: GlyphKey
  /** Tailwind size classes for the tile box; defaults to the NPC list size. */
  sizeClass?: string
  glyphClass?: string
}

export function Tile({
  entityId,
  glyph,
  sizeClass = 'h-[30px] w-[30px]',
  glyphClass = 'h-[19px] w-[19px]',
}: TileProps) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center text-white ${sizeClass}`}
      style={{ background: hashColor(entityId), clipPath: SHIELD_CLIP }}
    >
      <Glyph k={glyph} className={glyphClass} />
    </div>
  )
}
