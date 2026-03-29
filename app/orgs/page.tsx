import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getMyOrganizations } from '@/lib/data/organizations'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { Button } from '@/styles/catalyst-ui-kit/button'
import { Heading, Subheading } from '@/styles/catalyst-ui-kit/heading'
import { Text } from '@/styles/catalyst-ui-kit/text'
import { TextLink } from '@/styles/catalyst-ui-kit/text-link'

interface OrgsPageProps {
  searchParams: Promise<{ motivo?: string }>
}

export default async function OrgsPage({ searchParams }: OrgsPageProps) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { motivo } = await searchParams
  const memberships = await getMyOrganizations()

  return (
    <div className="glass-shell mx-auto flex min-h-full w-full max-w-2xl flex-col gap-10 px-6 py-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Heading>Mis organizaciones</Heading>
          <Text className="mt-2">Elige un negocio o crea uno nuevo.</Text>
        </div>
        <Button href="/orgs/nueva" color="dark/zinc">
          Nueva organización
        </Button>
      </div>

      {motivo === 'sin-acceso' ? (
        <Text className="rounded-lg border border-amber-500/30 bg-amber-50 px-4 py-3 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          No tienes acceso a esa organización o el slug no existe.
        </Text>
      ) : null}

      {memberships.length === 0 ? (
        <div className="glass-surface rounded-2xl p-8 sm:rounded-3xl">
          <Subheading level={3}>Aún no perteneces a ninguna</Subheading>
          <Text className="mt-2">
            Crea tu primera organización para usar inventario, POS y el resto de módulos.
          </Text>
          <Button href="/orgs/nueva" className="mt-6" color="dark/zinc">
            Crear organización
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-3" aria-label="Lista de organizaciones">
          {memberships.map((m) => (
            <li key={m.memberId}>
              {m.status === 'active' ? (
                <Link
                  href={`/${m.organization.slug}/dashboard`}
                  className="glass-surface flex items-center justify-between gap-4 rounded-2xl px-5 py-4 transition hover:border-muted-foreground/40"
                >
                  <div className="min-w-0">
                    <span className="block font-semibold text-foreground">
                      {m.organization.name}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      /{m.organization.slug}
                    </span>
                  </div>
                  <span className="shrink-0 text-sm font-medium text-muted-foreground">
                    Entrar →
                  </span>
                </Link>
              ) : (
                <div className="glass-surface flex items-center justify-between gap-4 rounded-2xl px-5 py-4 opacity-90">
                  <div className="min-w-0">
                    <span className="block font-semibold text-foreground">
                      {m.organization.name}
                    </span>
                    <span className="text-sm text-muted-foreground">
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
      )}

      <Text>
        <TextLink href="/">Volver al inicio</TextLink>
      </Text>
    </div>
  )
}
