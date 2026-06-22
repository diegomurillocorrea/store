'use client'

import clsx from 'clsx'

interface SidebarUserProfileProps {
  email: string
  className?: string
  compact?: boolean
}

function getInitials(email: string): string {
  const localPart = email.split('@')[0] ?? email
  const parts = localPart.split(/[._-]+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase()
  }
  return localPart.slice(0, 2).toUpperCase()
}

function getDisplayName(email: string): string {
  const localPart = email.split('@')[0] ?? email
  return localPart.replace(/[._-]+/g, ' ')
}

export function SidebarUserProfile({
  email,
  className,
  compact = false,
}: SidebarUserProfileProps) {
  const initials = getInitials(email)
  const displayName = getDisplayName(email)

  if (compact) {
    return (
      <span
        className={clsx(
          'flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xs font-semibold text-emerald-700 outline -outline-offset-1 outline-black/5 dark:bg-emerald-950/50 dark:text-emerald-300',
          className
        )}
        aria-hidden="true"
      >
        {initials}
      </span>
    )
  }

  return (
    <div className={clsx('flex min-w-0 items-center gap-x-4', className)}>
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xs font-semibold text-emerald-700 outline -outline-offset-1 outline-black/5 dark:bg-emerald-950/50 dark:text-emerald-300"
        aria-hidden="true"
      >
        {initials}
      </span>
      <div className="min-w-0 flex-1">
        <span className="sr-only">Tu perfil</span>
        <span className="block truncate text-sm/6 font-semibold text-zinc-900 dark:text-zinc-100">
          {displayName}
        </span>
        <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">{email}</span>
      </div>
    </div>
  )
}
