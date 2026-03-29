'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/styles/catalyst-ui-kit/button'
import { Field, FieldGroup, Fieldset, Label } from '@/styles/catalyst-ui-kit/fieldset'
import { Heading } from '@/styles/catalyst-ui-kit/heading'
import { Input } from '@/styles/catalyst-ui-kit/input'
import { Text } from '@/styles/catalyst-ui-kit/text'
import { TextLink } from '@/styles/catalyst-ui-kit/text-link'

export function RegisterForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setIsPending(true)

    const origin = window.location.origin
    const supabase = createSupabaseBrowserClient()
    const { data, error: signError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=/orgs`,
      },
    })

    if (signError) {
      setError(signError.message)
      setIsPending(false)
      return
    }

    if (data.session) {
      router.refresh()
      router.push('/orgs')
      return
    }

    setInfo('Revisa tu correo para confirmar la cuenta (si está activada la verificación en Supabase).')
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
              type="password"
              name="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
        </FieldGroup>
      </Fieldset>
      {error ? (
        <Text className="text-red-600 dark:text-red-400" role="alert">
          {error}
        </Text>
      ) : null}
      {info ? (
        <Text className="text-emerald-700 dark:text-emerald-400" role="status">
          {info}
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
