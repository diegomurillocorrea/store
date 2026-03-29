import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { Button } from '@/styles/catalyst-ui-kit/button'
import { Heading } from '@/styles/catalyst-ui-kit/heading'
import { Text } from '@/styles/catalyst-ui-kit/text'
import { TextLink } from '@/styles/catalyst-ui-kit/text-link'

export default async function Home() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/orgs')
  }

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-lg rounded-xl border border-border bg-surface p-8 shadow-xs ring-1 ring-border/70 dark:ring-border/80">
        <Heading>Store</Heading>
        <Text className="mt-3">
          Punto de venta e inventario multi-tenant con Supabase. Inicia sesión para entrar a tus organizaciones.
        </Text>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button href="/login" color="dark/zinc">
            Iniciar sesión
          </Button>
          <TextLink href="/register" className="sm:ml-2">
            Crear cuenta
          </TextLink>
        </div>
      </div>
    </div>
  )
}
