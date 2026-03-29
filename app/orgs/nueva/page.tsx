import { redirect } from 'next/navigation'
import { CreateOrgForm } from '@/components/auth/create-org-form'
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
    <AuthLayout>
      <div className="grid w-full max-w-lg grid-cols-1 gap-6">
        <CreateOrgForm />
        <TextLink href="/orgs" className="text-sm">
          ← Volver a mis organizaciones
        </TextLink>
      </div>
    </AuthLayout>
  )
}
