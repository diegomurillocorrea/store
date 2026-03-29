import { Suspense } from 'react'
import { LoginForm } from '@/components/auth/login-form'
import { AuthLayout } from '@/styles/catalyst-ui-kit/auth-layout'

function LoginFallback() {
  return (
    <div className="text-center text-sm text-zinc-500 dark:text-zinc-400" role="status">
      Cargando formulario…
    </div>
  )
}

export default function LoginPage() {
  return (
    <AuthLayout>
      <Suspense fallback={<LoginFallback />}>
        <LoginForm />
      </Suspense>
    </AuthLayout>
  )
}
