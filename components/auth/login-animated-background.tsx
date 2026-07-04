'use client'

import { useEffect, useRef } from 'react'
import { animate, utils } from 'animejs'

const GLOWS = [
  { className: 'h-[34rem] w-[34rem] bg-emerald-400/25 dark:bg-emerald-500/15', position: '-left-40 -top-40', parallax: 14 },
  { className: 'h-[26rem] w-[26rem] bg-teal-300/20 dark:bg-teal-500/10', position: '-bottom-32 -right-32', parallax: -12 },
]

export function LoginAnimatedBackground () {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return undefined

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const glowCores = root.querySelectorAll<HTMLDivElement>('[data-glow-core]')
    const glowWraps = root.querySelectorAll<HTMLDivElement>('[data-glow-wrap]')
    const spotlight = root.querySelector<HTMLDivElement>('[data-spotlight]')

    if (prefersReducedMotion) {
      utils.set(glowCores, { opacity: 0.6 })
      if (spotlight) utils.set(spotlight, { opacity: 0.8 })
      return undefined
    }

    const glowAnimations = Array.from(glowCores).map((glow, index) =>
      animate(glow, {
        translateX: [
          { to: `${utils.random(-40, 40)}px`, duration: utils.random(9000, 13000) },
          { to: `${utils.random(-40, 40)}px`, duration: utils.random(9000, 13000) },
        ],
        translateY: [
          { to: `${utils.random(-36, 36)}px`, duration: utils.random(9000, 13000) },
          { to: `${utils.random(-36, 36)}px`, duration: utils.random(9000, 13000) },
        ],
        scale: [
          { to: utils.random(1, 1.15, 2), duration: utils.random(8000, 11000) },
          { to: utils.random(0.92, 1.05, 2), duration: utils.random(8000, 11000) },
        ],
        loop: true,
        alternate: true,
        ease: 'inOutSine',
        delay: index * 400,
      })
    )

    let spotlightAnimation: ReturnType<typeof animate> | undefined
    if (spotlight) {
      spotlightAnimation = animate(spotlight, {
        opacity: [
          { to: 0.85, duration: 3200 },
          { to: 0.5, duration: 3200 },
        ],
        scale: [
          { to: 1.06, duration: 3200 },
          { to: 0.97, duration: 3200 },
        ],
        loop: true,
        alternate: true,
        ease: 'inOutSine',
      })
    }

    let rafId = 0
    let pointerX = 0
    let pointerY = 0
    const currentOffsets = Array.from(glowWraps, () => ({ x: 0, y: 0 }))

    const handlePointerMove = (event: PointerEvent) => {
      pointerX = (event.clientX / window.innerWidth - 0.5) * 2
      pointerY = (event.clientY / window.innerHeight - 0.5) * 2
    }

    const tick = () => {
      glowWraps.forEach((wrap, index) => {
        const strength = GLOWS[index % GLOWS.length]?.parallax ?? 12
        const offset = currentOffsets[index]
        offset.x = utils.lerp(offset.x, pointerX * strength, 0.04)
        offset.y = utils.lerp(offset.y, pointerY * strength, 0.04)
        wrap.style.transform = `translate3d(${offset.x.toFixed(2)}px, ${offset.y.toFixed(2)}px, 0)`
      })
      rafId = window.requestAnimationFrame(tick)
    }

    window.addEventListener('pointermove', handlePointerMove)
    rafId = window.requestAnimationFrame(tick)

    return () => {
      window.cancelAnimationFrame(rafId)
      window.removeEventListener('pointermove', handlePointerMove)
      glowAnimations.forEach((instance) => instance.revert())
      spotlightAnimation?.revert()
    }
  }, [])

  return (
    <div ref={rootRef} className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {GLOWS.map((glow, index) => (
        <div key={index} data-glow-wrap className={`absolute ${glow.position}`}>
          <div data-glow-core className={`rounded-full blur-[110px] ${glow.className}`} />
        </div>
      ))}

      <div
        data-spotlight
        className="absolute left-1/2 top-1/2 h-120 w-120 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400/15 opacity-70 blur-[100px] dark:bg-emerald-500/10"
      />
    </div>
  )
}
