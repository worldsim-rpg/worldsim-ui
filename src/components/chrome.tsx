/* Shared panel chrome: titles, section tags, chip styles, small UI icons. */

import type { ReactNode } from 'react'

export function PanelTitle({
  children,
  right,
}: {
  children: ReactNode
  /** Optional right-corner slot (global buttons live in panel corners, round 6). */
  right?: ReactNode
}) {
  return (
    <div className="mb-2.5 flex items-center justify-between border-b border-line-faint pb-1.5">
      <span className="text-[11.5px] font-bold uppercase tracking-[1.2px] text-accent">
        {children}
      </span>
      {right}
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

/** Tiny diamond marking risky actions (round 8: color + glyph, no numbers). */
function RiskMark() {
  return (
    <svg viewBox="0 0 8 8" className="mr-1 inline-block h-2 w-2" aria-hidden="true">
      <path d="M4 0.5 7.5 4 4 7.5 0.5 4z" fill="var(--color-risk)" />
    </svg>
  )
}

/** Interactive chip (actions, exits). */
export function ChipButton({
  children,
  onClick,
  title,
  disabled = false,
  risky = false,
}: {
  children: ReactNode
  onClick: () => void
  title?: string
  /** Unavailable: dimmed, cursor not-allowed, click does nothing (previz). */
  disabled?: boolean
  risky?: boolean
}) {
  const base =
    'rounded-full border bg-chip-bg px-2.5 py-0.5 text-[11.5px] transition-colors'
  const tone = risky
    ? 'border-risk/70 text-chip-act-ink'
    : 'border-chip-act-line text-chip-act-ink'
  const interactivity = disabled
    ? 'cursor-not-allowed opacity-45'
    : 'cursor-pointer hover:border-accent hover:text-ink'
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      title={title}
      aria-disabled={disabled}
      className={`${base} ${tone} ${interactivity}`}
    >
      {risky && <RiskMark />}
      {children}
    </button>
  )
}

/** Small icon button for panel corners (journal, settings; rounds 6-7). */
export function IconButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="cursor-pointer rounded p-0.5 text-muted transition-colors hover:text-accent"
    >
      {children}
    </button>
  )
}

const ICON_S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7 } as const

export function BookIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" {...ICON_S} strokeLinejoin="round" />
      <path d="M4 20.5V5.5M20 18v3H6.5a2.5 2.5 0 0 1 0-5" {...ICON_S} strokeLinejoin="round" />
      <path d="M9 7.5h7M9 10.5h7" stroke="currentColor" strokeWidth="1.4" fill="none" />
    </svg>
  )
}

export function GearIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="3.2" {...ICON_S} />
      <path
        d="M12 2.8v3M12 18.2v3M21.2 12h-3M5.8 12h-3M18.5 5.5l-2.1 2.1M7.6 16.4l-2.1 2.1M18.5 18.5l-2.1-2.1M7.6 7.6 5.5 5.5"
        {...ICON_S}
        strokeLinecap="round"
      />
    </svg>
  )
}
