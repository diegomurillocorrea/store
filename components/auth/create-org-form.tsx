'use client'

import { useActionState } from 'react'
import { createOrganizationAction, type CreateOrgState } from '@/lib/actions/organization-actions'
import { Button } from '@/styles/catalyst-ui-kit/button'
import { Field, FieldGroup, Fieldset, Label } from '@/styles/catalyst-ui-kit/fieldset'
import { Heading } from '@/styles/catalyst-ui-kit/heading'
import { Input } from '@/styles/catalyst-ui-kit/input'
import { Text } from '@/styles/catalyst-ui-kit/text'

const initialState: CreateOrgState = { error: null }

export function CreateOrgForm() {
  const [state, formAction, pending] = useActionState(createOrganizationAction, initialState)

  return (
    <form action={formAction} className="grid w-full max-w-md grid-cols-1 gap-8">
      <div>
        <Heading>Nueva organización</Heading>
        <Text className="mt-2">
          Crea el espacio de tu negocio. El slug define la URL{' '}
          <code className="text-sm text-zinc-800 dark:text-zinc-200">/tu-slug/dashboard</code>.
        </Text>
      </div>
      <Fieldset>
        <FieldGroup>
          <Field>
            <Label>Nombre del negocio</Label>
            <Input type="text" name="name" required placeholder="Mi tienda" minLength={2} />
          </Field>
          <Field>
            <Label>Slug (URL)</Label>
            <Input
              type="text"
              name="slug"
              required
              placeholder="mi-tienda"
              minLength={2}
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              title="Solo minúsculas, números y guiones"
            />
          </Field>
        </FieldGroup>
      </Fieldset>
      {state.error ? (
        <Text className="text-red-600 dark:text-red-400" role="alert">
          {state.error}
        </Text>
      ) : null}
      <Button type="submit" className="w-full max-w-xs" disabled={pending} color="dark/zinc">
        {pending ? 'Creando…' : 'Crear organización'}
      </Button>
    </form>
  )
}
