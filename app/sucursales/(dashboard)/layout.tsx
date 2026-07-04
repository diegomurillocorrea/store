import { redirect } from 'next/navigation'
import { LoginAnimatedBackground } from '@/components/auth/login-animated-background'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { AuthLayout } from '@/styles/catalyst-ui-kit/auth-layout'

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
    <AuthLayout animated background={<LoginAnimatedBackground />}>
      {children}
    </AuthLayout>
  )
}
