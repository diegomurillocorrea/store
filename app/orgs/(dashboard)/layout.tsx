import { redirect } from 'next/navigation'
import { OrgsShell } from '@/components/orgs-shell'
import { createSupabaseServerClient } from '@/lib/supabase/server'

interface OrgsDashboardLayoutProps {
  children: React.ReactNode
}

export default async function OrgsDashboardLayout({ children }: OrgsDashboardLayoutProps) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <OrgsShell userEmail={user.email ?? 'usuario@daiego.app'}>{children}</OrgsShell>
  )
}
