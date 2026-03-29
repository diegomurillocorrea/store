'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/styles/catalyst-ui-kit/button'
import { Field, FieldGroup, Fieldset, Label } from '@/styles/catalyst-ui-kit/fieldset'
import { Heading } from '@/styles/catalyst-ui-kit/heading'
import { Input } from '@/styles/catalyst-ui-kit/input'
import { Text } from '@/styles/catalyst-ui-kit/text'
import { TextLink } from '@/styles/catalyst-ui-kit/text-link'

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = searchParams.get('next') ?? '/orgs'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsPending(true)

    const supabase = createSupabaseBrowserClient()
    const { error: signError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (signError) {
      setError(signError.message)
      setIsPending(false)
      return
    }

    router.refresh()
    router.push(nextPath.startsWith('/') ? nextPath : '/orgs')
  }

  return (
    <form onSubmit={handleSubmit} className="grid w-full max-w-sm grid-cols-1 gap-8">
      <Heading>Iniciar sesión</Heading>
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
              autoComplete="current-password"
              required
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
      <Button type="submit" className="w-full" disabled={isPending} color="dark/zinc">
        {isPending ? 'Entrando…' : 'Entrar'}
      </Button>
      <Text>
        ¿No tienes cuenta? <TextLink href="/register">Registrarse</TextLink>
      </Text>
    </form>
  )
}
