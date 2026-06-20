'use client'

import clsx from 'clsx'
import type React from 'react'
import { Link } from './link'

export function TextLink({ className, ...props }: React.ComponentPropsWithoutRef<typeof Link>) {
  return (
    <Link
      {...props}
      className={clsx(
        className,
        '!text-foreground underline decoration-foreground/50 data-hover:decoration-foreground'
      )}
    />
  )
}
