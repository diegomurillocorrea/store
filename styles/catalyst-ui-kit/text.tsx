import clsx from 'clsx'
import type React from 'react'

export function Text({ className, ...props }: React.ComponentPropsWithoutRef<'p'>) {
  return (
    <p
      data-slot="text"
      {...props}
      className={clsx('text-base/6 sm:text-sm/6 !text-foreground', className)}
    />
  )
}

export function Strong({ className, ...props }: React.ComponentPropsWithoutRef<'strong'>) {
  return <strong {...props} className={clsx('font-medium !text-foreground', className)} />
}

export function Code({ className, ...props }: React.ComponentPropsWithoutRef<'code'>) {
  return (
    <code
      {...props}
      className={clsx(
        className,
        'rounded-sm border border-zinc-950/10 bg-zinc-950/2.5 px-0.5 text-sm font-medium !text-foreground sm:text-[0.8125rem] dark:border-white/20 dark:bg-white/5'
      )}
    />
  )
}
