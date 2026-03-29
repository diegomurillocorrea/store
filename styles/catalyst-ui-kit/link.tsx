'use client'

import * as Headless from '@headlessui/react'
import NextLink from 'next/link'
import React, { forwardRef } from 'react'

export const Link = forwardRef(function Link(
  { href, ...props }: { href: string } & Omit<React.ComponentPropsWithoutRef<'a'>, 'href'>,
  ref: React.ForwardedRef<HTMLAnchorElement>
) {
  return (
    <Headless.DataInteractive>
      <NextLink href={href} {...props} ref={ref} />
    </Headless.DataInteractive>
  )
})
