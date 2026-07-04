'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useNotifications } from '@/components/notifications/notification-provider'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/styles/catalyst-ui-kit/button'
import { Checkbox, CheckboxField } from '@/styles/catalyst-ui-kit/checkbox'
import { Field, FieldGroup, Fieldset, Label } from '@/styles/catalyst-ui-kit/fieldset'
import { Heading } from '@/styles/catalyst-ui-kit/heading'
import { Input } from '@/styles/catalyst-ui-kit/input'
import { Text } from '@/styles/catalyst-ui-kit/text'
import { TextLink } from '@/styles/catalyst-ui-kit/text-link'

export function RegisterForm() {
  const router = useRouter()
  const { notify } = useNotifications()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsPending(true)

    const origin = window.location.origin
    const supabase = createSupabaseBrowserClient()
    const { data, error: signError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=/sucursales`,
      },
    })

    if (signError) {
      setError(signError.message)
      setIsPending(false)
      return
    }

    if (data.session) {
      router.refresh()
      router.push('/sucursales')
      return
    }

    notify({
      title: 'Revisa tu correo',
      description: 'Confirma tu cuenta desde el enlace que te enviamos (si está activada la verificación en Supabase).',
      variant: 'success',
    })
    setIsPending(false)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="grid w-full max-w-sm grid-cols-1 gap-8">
      <Heading>Crear cuenta</Heading>
      <Fieldset>
        <FieldGroup>
          <Field>
            <Label>Correo</Label>
            <Input
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field>
            <Label>Contraseña</Label>
            <Input
              type={showPassword ? 'text' : 'password'}
              name="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <CheckboxField>
            <Checkbox
              name="show-password"
              checked={showPassword}
              onChange={setShowPassword}
              color="emerald"
            />
            <Label>Mostrar contraseña</Label>
          </CheckboxField>
        </FieldGroup>
      </Fieldset>
      {error ? (
        <Text className="text-red-600 dark:text-red-400" role="alert">
          {error}
        </Text>
      ) : null}
      <Button type="submit" className="w-full" disabled={isPending} color="dark/zinc">
        {isPending ? 'Registrando…' : 'Registrarse'}
      </Button>
      <Text>
        ¿Ya tienes cuenta? <TextLink href="/login">Iniciar sesión</TextLink>
      </Text>
    </form>
  )
}
