// One stroke icon set for chrome, so the bar, the toggle and the FAB share a weight. Ported from the spike.
const paths = {
  grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  list: 'M4 6h16M4 12h16M4 18h16',
  map: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14',
  quests: 'M5 21V4M5 4h11l-2.5 4L16 12H5',
  journal: 'M4 5h16v14H4zM4 15l5-5 4 4 3-3 4 4M15 8.5h.01',
  you: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 3.6-6 8-6s8 2 8 6',
  sliders: 'M4 6h16M7 12h10M10 18h4',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-3.5-3.5',
  book: 'M12 6.5C10.5 5.3 8.4 4.8 5 5v13c3.4-.2 5.5.3 7 1.5 1.5-1.2 3.6-1.7 7-1.5V5c-3.4-.2-5.5.3-7 1.5zM12 6.5v13',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01',
  arrowLeft: 'M19 12H5m6-6-6 6 6 6',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  chevron: 'M6 9l6 6 6-6',
  camera: 'M4 8h3.5L9 5.5h6L16.5 8H20v11H4zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
  heart: 'M20.8 5.7a5 5 0 0 0-7.1 0L12 7.4l-1.7-1.7a5 5 0 0 0-7.1 7.1L12 21l8.8-8.2a5 5 0 0 0 0-7.1z',
  leaf: 'M20 4C11 4 5 8.5 5 15c0 2.8 2.2 5 5 5 6.5 0 9.5-7 10-16zM5 20c2.5-4.5 6-7.5 11-10',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
} as const satisfies Record<string, string>

export type IconName = keyof typeof paths

// The bottom bar's active glyphs (handoff 0014 G3): the same shapes filled. `fill` is painted in the current colour,
// `over` is stroked in the bar's card colour on top of it (the journal's mountains), `stroke` keeps a line that has no area (the flag's pole).
const filled = {
  grid: { fill: paths.grid },
  quests: { fill: 'M5 4h11l-2.5 4L16 12H5z', stroke: 'M5 21V4' },
  journal: { fill: 'M4 5h16v14H4z', over: 'M6 15.5l3.5-3.5 3.5 3.5 3-3 2 2M15 8.5h.01' },
  you: { fill: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 3.6-6 8-6s8 2 8 6z' },
} as const satisfies Partial<Record<IconName, { fill: string; stroke?: string; over?: string }>>
export type FilledIconName = keyof typeof filled

export const FilledIcon = ({ name, size = 22, className = '' }: { name: FilledIconName; size?: number; className?: string }) => {
  const f = filled[name] as { fill: string; stroke?: string; over?: string }
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden>
      <path d={f.fill} fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      {f.stroke && <path d={f.stroke} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />}
      {f.over && <path d={f.over} fill="none" stroke="var(--color-card)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  )
}

export const Icon = ({ name, size = 22, className = '' }: { name: IconName; size?: number; className?: string }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d={paths[name]} />
  </svg>
)

type ProgressMarkProps = { size?: number; className?: string; title?: string }

// The two progress marks are one visual vocabulary: a flat colour disc, a cream line glyph and the same rounded
// geometry and stroke weight. Only their symbol, colour and position distinguish discovered from studied.
function ProgressMark({ kind, size = 20, className = '', title }: ProgressMarkProps & { kind: 'seen' | 'studied' }) {
  const seen = kind === 'seen'
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full text-white ${seen ? 'bg-moss' : 'bg-amber'} ${className}`}
      style={{ width: size, height: size }}
      title={title}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}>
      <svg viewBox="0 0 24 24" width={size * 0.68} height={size * 0.68} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d={seen ? paths.check : paths.book} />
      </svg>
    </span>
  )
}

// Wrappers keep call sites semantic while guaranteeing that both axes retain the same badge treatment application-wide.
export const StudiedMark = (props: ProgressMarkProps) => <ProgressMark kind="studied" {...props} />
export const SeenMark = (props: ProgressMarkProps) => <ProgressMark kind="seen" {...props} />
