/* Shared panel chrome: titles, section tags, chip styles. */

import type { ReactNode } from 'react'

export function PanelTitle({ children }: { children: ReactNode }) {
  return (
    <div className="mb-2.5 border-b border-line-faint pb-1.5 text-[11.5px] font-bold uppercase tracking-[1.2px] text-accent">
      {children}
    </div>
  )
}

export function SectionTag({ children }: { children: ReactNode }) {
  return (
    <div className="mb-1.5 mt-3.5 text-[10px] uppercase tracking-[0.7px] text-faint">
      {children}
    </div>
  )
}

/** Non-interactive info chip (noticed items, inventory). */
export function InfoChip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-line bg-chip-bg px-2.5 py-0.5 text-[11.5px] text-chip-ink">
      {children}
    </span>
  )
}

/** Interactive chip (actions, exits). */
export function ChipButton({
  children,
  onClick,
  title,
}: {
  children: ReactNode
  onClick: () => void
  title?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="cursor-pointer rounded-full border border-chip-act-line bg-chip-bg px-2.5 py-0.5 text-[11.5px] text-chip-act-ink transition-colors hover:border-accent hover:text-ink"
    >
      {children}
    </button>
  )
}
