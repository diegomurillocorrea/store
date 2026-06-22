import Link from 'next/link'
import { getMyOrganizations } from '@/lib/data/organizations'
import { Button } from '@/styles/catalyst-ui-kit/button'
import { Heading, Subheading } from '@/styles/catalyst-ui-kit/heading'
import { Text } from '@/styles/catalyst-ui-kit/text'
import { TextLink } from '@/styles/catalyst-ui-kit/text-link'

interface OrgsPageProps {
  searchParams: Promise<{ motivo?: string }>
}

export default async function OrgsPage({ searchParams }: OrgsPageProps) {
  const { motivo } = await searchParams
  const memberships = await getMyOrganizations()

  return (
    <div className="flex w-full flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Heading>Mis organizaciones</Heading>
          <Text className="mt-2">Elige un negocio o crea uno nuevo.</Text>
        </div>
        <Button href="/orgs/nueva" color="dark/zinc" className="shrink-0">
          Nueva organización
        </Button>
      </div>

      {motivo === 'sin-acceso' ? (
        <Text className="rounded-lg border border-amber-500/30 bg-amber-50 px-4 py-3 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          No tienes acceso a esa organización o el slug no existe.
        </Text>
      ) : null}

      {memberships.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
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
                  className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white px-5 py-4 transition hover:border-emerald-500/40 hover:bg-emerald-50/50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-500/30 dark:hover:bg-emerald-950/20"
                >
                  <div className="min-w-0">
                    <span className="block font-semibold text-foreground">
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
                <div className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white px-5 py-4 opacity-90 dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="min-w-0">
                    <span className="block font-semibold text-foreground">
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
      )}

      <Text>
        <TextLink href="/">Volver al inicio</TextLink>
      </Text>
    </div>
  )
}
