import clsx from 'clsx'

const TAG_BADGE_TONES = [
  {
    badge: 'bg-gray-50 text-gray-600 inset-ring-gray-500/10 dark:bg-zinc-800 dark:text-zinc-300 dark:inset-ring-white/10',
    button: 'hover:bg-gray-500/20 dark:hover:bg-white/10',
    icon: 'stroke-gray-600/50 group-hover:stroke-gray-600/75 dark:stroke-zinc-400/60 dark:group-hover:stroke-zinc-200',
  },
  {
    badge: 'bg-red-50 text-red-700 inset-ring-red-600/10 dark:bg-red-950/50 dark:text-red-300 dark:inset-ring-red-500/20',
    button: 'hover:bg-red-600/20 dark:hover:bg-red-400/20',
    icon: 'stroke-red-600/50 group-hover:stroke-red-600/75 dark:stroke-red-300/60 dark:group-hover:stroke-red-200',
  },
  {
    badge: 'bg-yellow-50 text-yellow-800 inset-ring-yellow-600/20 dark:bg-yellow-950/40 dark:text-yellow-200 dark:inset-ring-yellow-500/20',
    button: 'hover:bg-yellow-600/20 dark:hover:bg-yellow-400/20',
    icon: 'stroke-yellow-700/50 group-hover:stroke-yellow-700/75 dark:stroke-yellow-200/60 dark:group-hover:stroke-yellow-100',
  },
  {
    badge: 'bg-green-50 text-green-700 inset-ring-green-600/20 dark:bg-emerald-950/50 dark:text-emerald-300 dark:inset-ring-emerald-500/20',
    button: 'hover:bg-green-600/20 dark:hover:bg-emerald-400/20',
    icon: 'stroke-green-700/50 group-hover:stroke-green-700/75 dark:stroke-emerald-300/60 dark:group-hover:stroke-emerald-200',
  },
  {
    badge: 'bg-blue-50 text-blue-700 inset-ring-blue-700/10 dark:bg-blue-950/50 dark:text-blue-300 dark:inset-ring-blue-500/20',
    button: 'hover:bg-blue-600/20 dark:hover:bg-blue-400/20',
    icon: 'stroke-blue-700/50 group-hover:stroke-blue-700/75 dark:stroke-blue-300/60 dark:group-hover:stroke-blue-200',
  },
  {
    badge: 'bg-indigo-50 text-indigo-700 inset-ring-indigo-700/10 dark:bg-indigo-950/50 dark:text-indigo-300 dark:inset-ring-indigo-500/20',
    button: 'hover:bg-indigo-600/20 dark:hover:bg-indigo-400/20',
    icon: 'stroke-indigo-600/50 group-hover:stroke-indigo-600/75 dark:stroke-indigo-300/60 dark:group-hover:stroke-indigo-200',
  },
  {
    badge: 'bg-purple-50 text-purple-700 inset-ring-purple-700/10 dark:bg-purple-950/50 dark:text-purple-300 dark:inset-ring-purple-500/20',
    button: 'hover:bg-purple-600/20 dark:hover:bg-purple-400/20',
    icon: 'stroke-violet-600/50 group-hover:stroke-violet-600/75 dark:stroke-purple-300/60 dark:group-hover:stroke-purple-200',
  },
  {
    badge: 'bg-pink-50 text-pink-700 inset-ring-pink-700/10 dark:bg-pink-950/50 dark:text-pink-300 dark:inset-ring-pink-500/20',
    button: 'hover:bg-pink-600/20 dark:hover:bg-pink-400/20',
    icon: 'stroke-pink-700/50 group-hover:stroke-pink-700/75 dark:stroke-pink-300/60 dark:group-hover:stroke-pink-200',
  },
] as const

function badgeToneIndex(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }
  return hash % TAG_BADGE_TONES.length
}

interface RemovableTagBadgeProps {
  name: string
  onRemove: () => void
}

export function RemovableTagBadge({ name, onRemove }: RemovableTagBadgeProps) {
  const tone = TAG_BADGE_TONES[badgeToneIndex(name)]

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-x-0.5 rounded-md px-2 py-1 text-xs font-medium inset-ring',
        tone.badge
      )}
    >
      {name}
      <button
        type="button"
        onClick={onRemove}
        className={clsx(
          'group relative -mr-1 size-3.5 rounded-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50',
          tone.button
        )}
      >
        <span className="sr-only">Quitar {name}</span>
        <svg viewBox="0 0 14 14" className={clsx('size-3.5', tone.icon)}>
          <path d="M4 4l6 6m0-6l-6 6" />
        </svg>
        <span className="absolute -inset-1" />
      </button>
    </span>
  )
}
