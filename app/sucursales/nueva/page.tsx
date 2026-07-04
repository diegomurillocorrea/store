import { redirect } from 'next/navigation'
import { CreateOrgForm } from '@/components/auth/create-org-form'
import { LoginAnimatedBackground } from '@/components/auth/login-animated-background'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { AuthLayout } from '@/styles/catalyst-ui-kit/auth-layout'
import { TextLink } from '@/styles/catalyst-ui-kit/text-link'

export default async function NuevaOrgPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  return (
    <AuthLayout animated background={<LoginAnimatedBackground />}>
      <div className="grid w-full grid-cols-1 gap-6">
        <CreateOrgForm />
        <TextLink href="/sucursales" className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200">
          ← Volver a mis sucursales
        </TextLink>
      </div>
    </AuthLayout>
  )
}
