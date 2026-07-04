'use client'

import { useRouter } from 'next/navigation'
import { useActionState, useCallback, useEffect, useState } from 'react'
import { BusinessHoursFields } from '@/components/config/business-hours-fields'
import { LocationMapField } from '@/components/config/location-map-field'
import { SocialLinksFields } from '@/components/config/social-links-fields'
import {
  checkOrganizationSlugAction,
  updateOrganizationProfileAction,
  type OrgProfileFormState,
} from '@/lib/actions/org-profile-actions'
import {
  normalizeOrganizationSlug,
  SLUG_PATTERN,
  type OrganizationProfile,
} from '@/lib/organization/profile-types'
import { useActionStateNotification } from '@/lib/hooks/use-action-state-notification'
import { Button } from '@/styles/catalyst-ui-kit/button'
import { Field, FieldGroup, Fieldset, Label } from '@/styles/catalyst-ui-kit/fieldset'
import { Input } from '@/styles/catalyst-ui-kit/input'
import { Textarea } from '@/styles/catalyst-ui-kit/textarea'
import { Text } from '@/styles/catalyst-ui-kit/text'

const initialState: OrgProfileFormState = { error: null, ok: false }

interface OrgProfileFormProps {
  orgSlug: string
  initial: OrganizationProfile
  canEdit?: boolean
}

export function OrgProfileForm({ orgSlug, initial, canEdit = true }: OrgProfileFormProps) {
  const router = useRouter()
  const boundAction = updateOrganizationProfileAction.bind(null, orgSlug)
  const [state, formAction, pending] = useActionState(boundAction, initialState)

  const [name, setName] = useState(initial.name)
  const [slug, setSlug] = useState(initial.slug)
  const [description, setDescription] = useState(initial.description)
  const [locationAddress, setLocationAddress] = useState(initial.locationAddress)
  const [locationLat, setLocationLat] = useState<number | null>(initial.locationLat)
  const [locationLng, setLocationLng] = useState<number | null>(initial.locationLng)
  const [businessHours, setBusinessHours] = useState(initial.businessHours)
  const [socialLinks, setSocialLinks] = useState(initial.socialLinks)

  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle')
  const [slugMessage, setSlugMessage] = useState<string | null>(null)

  useActionStateNotification(state.ok, pending, 'Configuración guardada correctamente.')

  useEffect(() => {
    if (state.ok) {
      router.refresh()
    }
  }, [state.ok, router])

  const verifySlug = useCallback(async (candidate: string) => {
    const normalized = normalizeOrganizationSlug(candidate)
    if (normalized === initial.slug) {
      setSlugStatus('available')
      setSlugMessage('Slug actual de esta sucursal.')
      return
    }
    if (normalized.length < 2) {
      setSlugStatus('invalid')
      setSlugMessage('Mínimo 2 caracteres.')
      return
    }
    if (!SLUG_PATTERN.test(normalized)) {
      setSlugStatus('invalid')
      setSlugMessage('Solo minúsculas, números y guiones.')
      return
    }

    setSlugStatus('checking')
    const result = await checkOrganizationSlugAction(orgSlug, normalized)
    if (result.available) {
      setSlugStatus('available')
      setSlugMessage('Slug disponible.')
      return
    }
    setSlugStatus('taken')
    setSlugMessage(result.error ?? 'Ese slug ya está en uso.')
  }, [initial.slug, orgSlug])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      verifySlug(slug)
    }, 400)
    return () => window.clearTimeout(timer)
  }, [slug, verifySlug])

  const slugStatusClass =
    slugStatus === 'available'
      ? 'text-emerald-700 dark:text-emerald-300'
      : slugStatus === 'taken' || slugStatus === 'invalid'
        ? 'text-red-600 dark:text-red-400'
        : 'text-zinc-500 dark:text-zinc-400'

  return (
    <form action={formAction} className="grid max-w-3xl grid-cols-1 gap-10">
      <Fieldset disabled={!canEdit || pending}>
        <FieldGroup>
          <Field>
            <Label htmlFor="name">Nombre de la sucursal</Label>
            <Input
              id="name"
              name="name"
              type="text"
              required
              minLength={2}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>

          <Field>
            <Label htmlFor="slug">Slug (URL)</Label>
            <Input
              id="slug"
              name="slug"
              type="text"
              required
              minLength={2}
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              title="Solo minúsculas, números y guiones"
              value={slug}
              onChange={(e) => setSlug(normalizeOrganizationSlug(e.target.value))}
            />
            {slugMessage ? (
              <Text className={`mt-1 text-sm ${slugStatusClass}`} role="status">
                {slugStatus === 'checking' ? 'Verificando slug…' : slugMessage}
              </Text>
            ) : null}
            <Text className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              La URL quedará como /{slug || 'tu-slug'}/dashboard
            </Text>
          </Field>

          <Field>
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              name="description"
              rows={4}
              maxLength={2000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Cuéntale a tu equipo y clientes de qué se trata esta sucursal."
            />
          </Field>
        </FieldGroup>
      </Fieldset>

      <LocationMapField
        address={locationAddress}
        lat={locationLat}
        lng={locationLng}
        onAddressChange={setLocationAddress}
        onLatChange={setLocationLat}
        onLngChange={setLocationLng}
        disabled={!canEdit || pending}
      />

      <BusinessHoursFields
        hours={businessHours}
        onChange={setBusinessHours}
        disabled={!canEdit || pending}
      />

      <SocialLinksFields
        links={socialLinks}
        onChange={setSocialLinks}
        disabled={!canEdit || pending}
      />

      {state.error ? (
        <Text className="text-red-600 dark:text-red-400" role="alert">
          {state.error}
        </Text>
      ) : null}

      {canEdit ? (
        <div>
          <Button
            type="submit"
            color="dark/zinc"
            disabled={pending || slugStatus === 'taken' || slugStatus === 'invalid' || slugStatus === 'checking'}
          >
            {pending ? 'Guardando…' : 'Guardar configuración'}
          </Button>
        </div>
      ) : (
        <Text className="text-sm text-zinc-500 dark:text-zinc-400">
          Solo lectura: no tienes permiso para editar la configuración.
        </Text>
      )}
    </form>
  )
}
