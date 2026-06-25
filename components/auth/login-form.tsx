'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

const inputClassName =
  'block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-emerald-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-zinc-600 dark:placeholder:text-zinc-500 dark:focus:outline-emerald-500'

const checkboxClassName =
  'col-start-1 row-start-1 appearance-none rounded-sm border border-gray-300 bg-white checked:border-emerald-600 checked:bg-emerald-600 indeterminate:border-emerald-600 indeterminate:bg-emerald-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:border-gray-300 disabled:bg-gray-100 disabled:checked:bg-gray-100 dark:border-zinc-600 dark:bg-white/5 dark:checked:border-emerald-500 dark:checked:bg-emerald-500 forced-colors:appearance-auto'

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = searchParams.get('next') ?? '/sucursales'

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsPending(true)

    const supabase = createSupabaseBrowserClient()
    const { error: signError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (signError) {
      setError(signError.message)
      setIsPending(false)
      return
    }

    router.refresh()
    router.push(safeNextPath)
  }

  return (
    <>
      <div>
        <Link href="/" className="inline-flex items-center gap-2.5">
          <span className="flex size-10 items-center justify-center rounded-lg bg-emerald-600 text-lg font-bold text-white">
            S
          </span>
          <span className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white">Store</span>
        </Link>
        <h2 className="mt-8 text-2xl/9 font-bold tracking-tight text-gray-900 dark:text-white">
          Inicia sesión en tu cuenta
        </h2>
        <p className="mt-2 text-sm/6 text-gray-500 dark:text-zinc-400">
          ¿No tienes cuenta?{' '}
          <Link
            href="/register"
            className="font-semibold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300"
          >
            Regístrate gratis
          </Link>
        </p>
      </div>

      <div className="mt-10">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
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

          <div>
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

          <div className="flex gap-3">
            <div className="flex h-6 shrink-0 items-center">
              <div className="group grid size-4 grid-cols-1">
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
              </div>
            </div>
            <label htmlFor="show-password" className="block text-sm/6 text-gray-900 dark:text-white">
              Mostrar contraseña
            </label>
          </div>

          {error ? (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          ) : null}

          <div>
            <button
              type="submit"
              disabled={isPending}
              className="flex w-full justify-center rounded-md bg-emerald-600 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-xs hover:bg-emerald-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:opacity-50"
            >
              {isPending ? 'Entrando…' : 'Iniciar sesión'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
