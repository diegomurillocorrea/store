'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { animate, stagger, utils } from 'animejs'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

const inputClassName =
  'block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-emerald-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-zinc-600 dark:placeholder:text-zinc-500 dark:focus:outline-emerald-500'

const checkboxClassName =
  'col-start-1 row-start-1 appearance-none rounded-sm border border-gray-300 bg-white checked:border-emerald-600 checked:bg-emerald-600 indeterminate:border-emerald-600 indeterminate:bg-emerald-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:border-gray-300 disabled:bg-gray-100 disabled:checked:bg-gray-100 dark:border-zinc-600 dark:bg-white/5 dark:checked:border-emerald-500 dark:checked:bg-emerald-500 forced-colors:appearance-auto'

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = searchParams.get('next') ?? '/sucursales'
  const formRootRef = useRef<HTMLDivElement>(null)
  const submitButtonRef = useRef<HTMLButtonElement>(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  const safeNextPath = nextPath.startsWith('/') ? nextPath : '/sucursales'

  useEffect(() => {
    const authError = searchParams.get('error')
    if (authError === 'auth_callback') {
      setError('No se pudo completar la autenticación. Inténtalo de nuevo.')
    } else if (authError === 'missing_code') {
      setError('Enlace de autenticación inválido o expirado.')
    }
  }, [searchParams])

  useEffect(() => {
    const root = formRootRef.current
    if (!root) return undefined

    const targets = root.querySelectorAll<HTMLElement>('[data-field]')
    if (!targets.length) return undefined

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      utils.set(targets, { opacity: 1, translateY: '0px' })
      return undefined
    }

    const fieldTargets = targets
    const animation = animate(fieldTargets, {
      opacity: { from: 0, to: 1 },
      translateY: { from: 16, to: 0 },
      duration: 650,
      delay: stagger(90, { start: 260 }),
      ease: 'outQuad',
      onComplete: () => {
        utils.set(fieldTargets, { opacity: 1, translateY: '0px' })
      },
    })

    const failsafeId = window.setTimeout(() => {
      utils.set(fieldTargets, { opacity: 1, translateY: '0px' })
    }, 1400)

    return () => {
      window.clearTimeout(failsafeId)
      animation.cancel()
      utils.set(fieldTargets, { opacity: 1, translateY: '0px' })
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsPending(true)

    if (submitButtonRef.current) {
      animate(submitButtonRef.current, {
        scale: [1, 0.96, 1],
        duration: 320,
        ease: 'outQuad',
      })
    }

    const supabase = createSupabaseBrowserClient()
    const { error: signError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (signError) {
      setError(signError.message)
      setIsPending(false)
      if (formRootRef.current) {
        const errorTarget = formRootRef.current.querySelector<HTMLElement>('[data-error]')
        if (errorTarget) {
          animate(errorTarget, {
            translateX: [-8, 8, -6, 6, 0],
            duration: 420,
            ease: 'inOutSine',
          })
        }
      }
      return
    }

    router.refresh()
    router.push(safeNextPath)
  }

  return (
    <div ref={formRootRef}>
      <div data-field>
        <h2 className="text-2xl/9 font-bold tracking-tight text-gray-900 dark:text-white">
          Inicia sesión en tu cuenta
        </h2>
      </div>

      <div className="mt-10">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div data-field>
            <label htmlFor="email" className="block text-sm/6 font-medium text-gray-900 dark:text-white">
              Correo electrónico
            </label>
            <div className="mt-2">
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClassName}
              />
            </div>
          </div>

          <div data-field>
            <label htmlFor="password" className="block text-sm/6 font-medium text-gray-900 dark:text-white">
              Contraseña
            </label>
            <div className="mt-2">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClassName}
              />
            </div>
          </div>

          <label
            htmlFor="show-password"
            className="flex cursor-pointer select-none gap-3"
            data-field
          >
            <span className="flex h-6 shrink-0 items-center">
              <span className="group grid size-4 grid-cols-1">
                <input
                  id="show-password"
                  name="show-password"
                  type="checkbox"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                  className={checkboxClassName}
                />
                <svg
                  fill="none"
                  viewBox="0 0 14 14"
                  className="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white group-has-disabled:stroke-gray-950/25"
                  aria-hidden="true"
                >
                  <path
                    d="M3 8L6 11L11 3.5"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="opacity-0 group-has-checked:opacity-100"
                  />
                </svg>
              </span>
            </span>
            <span className="block text-sm/6 text-gray-900 dark:text-white">
              Mostrar contraseña
            </span>
          </label>

          {error ? (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert" data-error>
              {error}
            </p>
          ) : null}

          <div data-field>
            <button
              ref={submitButtonRef}
              type="submit"
              disabled={isPending}
              className="flex w-full justify-center rounded-md bg-emerald-600 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-xs transition-colors hover:bg-emerald-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:opacity-50"
            >
              {isPending ? 'Entrando…' : 'Iniciar sesión'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
