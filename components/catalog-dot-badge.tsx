import clsx from 'clsx'

const DOT_TONES = [
  'fill-red-500',
  'fill-yellow-500',
  'fill-green-500',
  'fill-blue-500',
  'fill-indigo-500',
  'fill-purple-500',
  'fill-pink-500',
] as const

function badgeToneIndex(value: string, length: number): number {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }
  return hash % length
}

interface CatalogDotBadgeProps {
  children: string
  selected?: boolean
  dimmed?: boolean
  onClick?: () => void
  className?: string
}

export function CatalogDotBadge({
  children,
  selected = false,
  dimmed = false,
  onClick,
  className,
}: CatalogDotBadgeProps) {
  const dotTone = DOT_TONES[badgeToneIndex(children, DOT_TONES.length)]
  const classes = clsx(
    'inline-flex max-w-full items-center gap-x-1.5 truncate rounded-md bg-white px-2 py-1 text-xs font-medium text-gray-900 inset-ring inset-ring-gray-200 transition dark:bg-zinc-900 dark:text-zinc-100 dark:inset-ring-zinc-700',
    onClick &&
      'cursor-pointer hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 dark:hover:bg-zinc-800/60',
    selected &&
      'ring-2 ring-zinc-900/20 ring-offset-1 dark:ring-white/25 dark:ring-offset-zinc-950',
    dimmed && 'opacity-55 hover:opacity-100',
    className
  )

  const content = (
    <>
      <svg
        viewBox="0 0 6 6"
        aria-hidden="true"
        className={clsx('size-1.5 shrink-0', dotTone)}
      >
        <circle r={3} cx={3} cy={3} />
      </svg>
      <span className="truncate">{children}</span>
    </>
  )

  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-pressed={selected} className={classes}>
        {content}
      </button>
    )
  }

  return <span className={classes}>{content}</span>
}
