/*
 * Role/place glyphs: hand-drawn SVG only, no generative images.
 * mug/anchor/hood/house are taken from the approved reference mockup
 * (layout-a-full.html); wheel/fish/salt/road are drawn in the same manner
 * (24x24 viewBox, stroke 1.8, currentColor).
 */

import type { ReactNode } from 'react'
import type { GlyphKey } from '../types/ui'

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8 } as const
const THIN = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.5 } as const

const GLYPHS: Record<GlyphKey, ReactNode> = {
  mug: (
    <>
      <rect x="6" y="7" width="9" height="12" rx="1.5" {...S} />
      <path d="M15 9h2.6a2.4 2.4 0 0 1 0 5H15" {...S} />
      <path d="M6.5 10.6h8" {...THIN} />
    </>
  ),
  anchor: (
    <>
      <circle cx="12" cy="5" r="2.2" {...S} />
      <path d="M12 7.2V20" {...S} strokeLinecap="round" />
      <path d="M8 11h8" {...S} strokeLinecap="round" />
      <path d="M5 13.5a7 7 0 0 0 14 0" {...S} strokeLinecap="round" />
    </>
  ),
  hood: (
    <>
      <path
        d="M12 2.5c-5 0-8 4.2-8 10 0 5.6 3.8 9 8 9s8-3.4 8-9c0-5.8-3-10-8-10z"
        {...S}
      />
      <ellipse cx="12" cy="13" rx="3" ry="4" fill="currentColor" opacity=".5" />
    </>
  ),
  house: (
    <>
      <path d="M4 10.5l8-5 8 5" {...S} strokeLinejoin="round" />
      <path d="M5.5 10v8.5h13V10" {...S} strokeLinejoin="round" />
      <rect x="10" y="13.5" width="4" height="5" {...THIN} />
    </>
  ),
  wheel: (
    <>
      <circle cx="12" cy="12" r="8" {...S} />
      <path d="M12 4v16M4 12h16M6.4 6.4l11.2 11.2M17.6 6.4L6.4 17.6" {...THIN} />
      <circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none" />
    </>
  ),
  fish: (
    <>
      <ellipse cx="13.5" cy="12" rx="7" ry="4.6" {...S} />
      <path d="M7 12L2.8 8.6v6.8z" {...S} strokeLinejoin="round" />
      <circle cx="16.8" cy="10.8" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  salt: (
    <>
      <path d="M12 3l3.2 4.5L12 12 8.8 7.5z" {...S} strokeLinejoin="round" />
      <path d="M6.3 12l2.4 3.5-2.4 3.5-2.4-3.5z" {...THIN} strokeLinejoin="round" />
      <path d="M17.2 11l2.7 4-2.7 4-2.7-4z" {...THIN} strokeLinejoin="round" />
    </>
  ),
  road: (
    <>
      <path d="M12 3v18" {...S} />
      <path d="M12 5h6.6l2 2-2 2H12z" {...THIN} strokeLinejoin="round" />
      <path d="M12 11H5.4l-2 2 2 2H12z" {...THIN} strokeLinejoin="round" />
      <path d="M8.5 21h7" {...THIN} strokeLinecap="round" />
    </>
  ),
}

export function Glyph({ k, className }: { k: GlyphKey; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      {GLYPHS[k]}
    </svg>
  )
}
