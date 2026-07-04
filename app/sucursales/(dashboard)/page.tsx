import Link from 'next/link'
import { OrgsSessionFooter } from '@/components/orgs/orgs-session-footer'
import { getMyOrganizations } from '@/lib/data/organizations'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const primaryButtonClassName =
  'flex w-full justify-center rounded-md bg-emerald-600 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-xs transition-colors hover:bg-emerald-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:opacity-50'

interface OrgsPageProps {
  searchParams: Promise<{ motivo?: string }>
}

export default async function OrgsPage({ searchParams }: OrgsPageProps) {
  const { motivo } = await searchParams
  const memberships = await getMyOrganizations()

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const userEmail = user?.email ?? 'usuario@daiego.app'

  return (
    <div className="flex w-full flex-col">
      <h2 className="text-2xl/9 font-bold tracking-tight text-gray-900 dark:text-white">
        Mis sucursales
      </h2>
      <p className="mt-2 text-sm/6 text-zinc-500 dark:text-zinc-400">
        Elige un negocio o crea uno nuevo.
      </p>

      <div className="mt-8 space-y-6">
        {motivo === 'sin-acceso' ? (
          <p
            className="rounded-md border border-amber-500/30 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
            role="alert"
          >
            No tienes acceso a esa sucursal o el slug no existe.
          </p>
        ) : null}

        {memberships.length === 0 ? (
          <div className="rounded-xl border border-zinc-200/80 bg-white/80 p-6 dark:border-zinc-800 dark:bg-zinc-900/80">
            <h3 className="text-base/6 font-semibold text-gray-900 dark:text-white">
              Aún no perteneces a ninguna
            </h3>
            <p className="mt-2 text-sm/6 text-zinc-500 dark:text-zinc-400">
              Crea tu primera sucursal para usar inventario, POS y el resto de módulos.
            </p>
            <Link href="/sucursales/nueva" className={`${primaryButtonClassName} mt-6`}>
              Crear sucursal
            </Link>
          </div>
        ) : (
          <>
            <ul className="flex flex-col gap-3" aria-label="Lista de sucursales">
              {memberships.map((m) => (
                <li key={m.memberId}>
                  {m.status === 'active' ? (
                    <Link
                      href={`/${m.organization.slug}/pos`}
                      className="flex items-center justify-between gap-4 rounded-md border border-zinc-200/80 bg-white/80 px-4 py-3 transition-colors hover:border-emerald-500/40 hover:bg-emerald-50/50 dark:border-zinc-700 dark:bg-white/5 dark:hover:border-emerald-500/30 dark:hover:bg-emerald-950/20"
                    >
                      <div className="min-w-0">
                        <span className="block text-sm/6 font-semibold text-gray-900 dark:text-white">
                          {m.organization.name}
                        </span>
                        <span className="text-sm text-zinc-500 dark:text-zinc-400">
                          /{m.organization.slug}
                        </span>
                      </div>
                      <span className="shrink-0 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                        Entrar →
                      </span>
                    </Link>
                  ) : (
                    <div className="flex items-center justify-between gap-4 rounded-md border border-zinc-200/80 bg-white/80 px-4 py-3 opacity-90 dark:border-zinc-700 dark:bg-white/5">
                      <div className="min-w-0">
                        <span className="block text-sm/6 font-semibold text-gray-900 dark:text-white">
                          {m.organization.name}
                        </span>
                        <span className="text-sm text-zinc-500 dark:text-zinc-400">
                          /{m.organization.slug}
                        </span>
                      </div>
                      <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-300">
                        {m.status}
                      </span>
                    </div>
                  )}
                </li>
              ))}
            </ul>

            <Link href="/sucursales/nueva" className={primaryButtonClassName}>
              Nueva sucursal
            </Link>
          </>
        )}
      </div>

      <OrgsSessionFooter email={userEmail} />
    </div>
  )
}
