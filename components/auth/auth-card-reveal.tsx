'use client'

import type React from 'react'
import { useEffect, useRef } from 'react'
import { animate, stagger, utils } from 'animejs'

interface AuthCardRevealProps {
  children: React.ReactNode
  animated?: boolean
  className?: string
}

export function AuthCardReveal ({ children, animated = false, className }: AuthCardRevealProps) {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!animated || !root) return undefined

    const targets = root.querySelectorAll<HTMLElement>('[data-auth-reveal]')
    if (!targets.length) return undefined

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      utils.set(targets, { opacity: 1, translateY: '0px' })
      return undefined
    }

    const revealTargets = targets
    const animation = animate(revealTargets, {
      opacity: { from: 0, to: 1 },
      translateY: { from: 16, to: 0 },
      duration: 520,
      delay: stagger(90, { start: 60 }),
      ease: 'outExpo',
      onComplete: () => {
        utils.set(revealTargets, { opacity: 1, translateY: '0px' })
      },
    })

    const failsafeId = window.setTimeout(() => {
      utils.set(revealTargets, { opacity: 1, translateY: '0px' })
    }, 1200)

    return () => {
      window.clearTimeout(failsafeId)
      animation.cancel()
      utils.set(revealTargets, { opacity: 1, translateY: '0px' })
    }
  }, [animated])

  return (
    <div ref={rootRef} className={className}>
      {children}
    </div>
  )
}
