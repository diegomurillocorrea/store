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
    <div className="glass-shell flex min-h-full flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="glass-surface w-full max-w-lg rounded-2xl p-8 sm:rounded-3xl">
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
