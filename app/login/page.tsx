import { Suspense } from 'react'
import { LoginForm } from '@/components/auth/login-form'
import { LoginAnimatedBackground } from '@/components/auth/login-animated-background'
import { AuthLayout } from '@/styles/catalyst-ui-kit/auth-layout'

function LoginFallback() {
  return (
    <div className="text-center text-sm text-gray-500 dark:text-zinc-400" role="status">
      Cargando formulario…
    </div>
  )
}

export default function LoginPage() {
  return (
    <AuthLayout animated background={<LoginAnimatedBackground />}>
      <Suspense fallback={<LoginFallback />}>
        <LoginForm />
      </Suspense>
    </AuthLayout>
  )
}
