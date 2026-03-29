'use client'

import { useRouter } from 'next/navigation'
import { useActionState, useEffect, useState } from 'react'
import {
  updateOrganizationBrandingAction,
  type BrandingFormState,
} from '@/lib/actions/branding-actions'
import type { OrganizationBranding } from '@/lib/theme/branding'
import { Button } from '@/styles/catalyst-ui-kit/button'
import { Field, FieldGroup, Fieldset, Label } from '@/styles/catalyst-ui-kit/fieldset'
import { Subheading } from '@/styles/catalyst-ui-kit/heading'
import { Input } from '@/styles/catalyst-ui-kit/input'
import { Text } from '@/styles/catalyst-ui-kit/text'

const initialState: BrandingFormState = { error: null, ok: false }

interface BrandingFormProps {
  orgSlug: string
  initial: OrganizationBranding
}

function ColorField({
  label,
  name,
  value,
  onChange,
  hint,
}: {
  label: string
  name: string
  value: string
  onChange: (v: string) => void
  hint?: string
}) {
  const pickerSafe = value.length === 7 && value.startsWith('#') ? value : '#888888'

  return (
    <Field>
      <Label>{label}</Label>
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="color"
          aria-label={label}
          className="h-10 w-14 cursor-pointer rounded border border-border bg-surface"
          value={pickerSafe}
          onChange={(e) => onChange(e.target.value)}
        />
        <Input
          type="text"
          name={name}
          className="max-w-36 font-mono text-sm"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          pattern="^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$"
          required
        />
      </div>
      {hint ? (
        <Text className="mt-1 text-xs">{hint}</Text>
      ) : null}
    </Field>
  )
}

export function BrandingForm({ orgSlug, initial }: BrandingFormProps) {
  const router = useRouter()
  const boundAction = updateOrganizationBrandingAction.bind(null, orgSlug)
  const [state, formAction, pending] = useActionState(boundAction, initialState)

  const [logoUrl, setLogoUrl] = useState(initial.logoUrl ?? '')
  const [panelWallpaperUrl, setPanelWallpaperUrl] = useState(initial.panelWallpaperUrl ?? '')
  const [pl, setPl] = useState(initial.primaryColorLight)
  const [pd, setPd] = useState(initial.primaryColorDark)
  const [al, setAl] = useState(initial.accentColorLight)
  const [ad, setAd] = useState(initial.accentColorDark)
  const [ml, setMl] = useState(initial.mutedColorLight)
  const [md, setMd] = useState(initial.mutedColorDark)
  const [sbl, setSbl] = useState(initial.shellBackgroundLight)
  const [sbd, setSbd] = useState(initial.shellBackgroundDark)
  const [ssl, setSsl] = useState(initial.shellSurfaceLight)
  const [ssd, setSsd] = useState(initial.shellSurfaceDark)

  useEffect(() => {
    if (state.ok) {
      router.refresh()
    }
  }, [state.ok, router])

  return (
    <form action={formAction} className="grid max-w-3xl grid-cols-1 gap-12">
      <Fieldset>
        <Subheading level={3} className="mb-4">
          Logo
        </Subheading>
        <FieldGroup>
          <Field>
            <Label>URL del logo</Label>
            <Input
              type="url"
              name="logo_url"
              placeholder="https://…"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
            />
            <Text className="mt-2 text-xs leading-relaxed">
              URLs de Instagram/Facebook se cargan por un proxy del servidor (Meta a veces bloquea imágenes
              directas en la web). Si no ves el logo, descarga la imagen y súbela a{' '}
              <strong>Supabase Storage</strong> o a tu CDN y pega una URL estable.
            </Text>
          </Field>
          <Field>
            <Label>Fondo del panel (imagen)</Label>
            <Input
              type="url"
              name="panel_wallpaper_url"
              placeholder="https://… (opcional)"
              value={panelWallpaperUrl}
              onChange={(e) => setPanelWallpaperUrl(e.target.value)}
            />
            <Text className="mt-2 text-xs leading-relaxed">
              Como en WhatsApp: la foto se ve detrás del contenido principal con efecto cristal. Sube la imagen a{' '}
              <strong>Supabase Storage</strong> (bucket público) u otro hosting con URL{' '}
              <code className="text-xs">https</code>, luego pégala aquí. Deja vacío para quitar el fondo. Instagram
              / Facebook usan el mismo proxy que el logo.
            </Text>
          </Field>
        </FieldGroup>
      </Fieldset>

      <Fieldset>
        <Subheading level={3} className="mb-2">
          Lienzo del panel
        </Subheading>
        <Text className="mb-4 text-sm text-muted-foreground">
          Fondo general del escritorio y color del panel donde va el contenido (y la barra lateral). Se aplica a
          todos los usuarios de esta organización.
        </Text>
        <div className="grid gap-10 md:grid-cols-2">
          <FieldGroup>
            <Subheading level={4} className="mb-3 text-sm font-semibold">
              Modo claro
            </Subheading>
            <ColorField
              label="Fondo del marco"
              name="shell_background_light"
              value={sbl}
              onChange={setSbl}
              hint="Área exterior en escritorio; también define bordes suaves alrededor del panel."
            />
            <ColorField
              label="Panel principal"
              name="shell_surface_light"
              value={ssl}
              onChange={setSsl}
              hint="Barra lateral y zona del contenido principal."
            />
          </FieldGroup>
          <FieldGroup>
            <Subheading level={4} className="mb-3 text-sm font-semibold">
              Modo oscuro
            </Subheading>
            <ColorField
              label="Fondo del marco"
              name="shell_background_dark"
              value={sbd}
              onChange={setSbd}
            />
            <ColorField
              label="Panel principal"
              name="shell_surface_dark"
              value={ssd}
              onChange={setSsd}
            />
          </FieldGroup>
        </div>
      </Fieldset>

      <div className="grid gap-10 md:grid-cols-2">
        <Fieldset>
          <Subheading level={3} className="mb-4">
            Modo claro
          </Subheading>
          <FieldGroup>
            <ColorField
              label="Título / nombre"
              name="primary_color_light"
              value={pl}
              onChange={setPl}
              hint="Nombre del negocio en la barra lateral."
            />
            <ColorField
              label="Acento"
              name="accent_color_light"
              value={al}
              onChange={setAl}
              hint="Indicador activo, bordes, enlaces."
            />
            <ColorField
              label="Texto secundario (gris)"
              name="muted_color_light"
              value={ml}
              onChange={setMl}
              hint="Etiqueta «Organización», ruta /slug, títulos de sección del menú."
            />
          </FieldGroup>
        </Fieldset>

        <Fieldset>
          <Subheading level={3} className="mb-4">
            Modo oscuro
          </Subheading>
          <FieldGroup>
            <ColorField
              label="Título / nombre"
              name="primary_color_dark"
              value={pd}
              onChange={setPd}
            />
            <ColorField
              label="Acento"
              name="accent_color_dark"
              value={ad}
              onChange={setAd}
            />
            <ColorField
              label="Texto secundario (gris)"
              name="muted_color_dark"
              value={md}
              onChange={setMd}
            />
          </FieldGroup>
        </Fieldset>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl p-3 shadow-xs" style={{ background: sbl }}>
          <div
            className="rounded-lg p-4 shadow-xs"
            style={{
              background: ssl,
              borderWidth: 1,
              borderStyle: 'solid',
              borderColor: 'color-mix(in srgb, #000 10%, transparent)',
            }}
          >
            <Text className="text-xs font-medium uppercase text-black/50">Vista clara</Text>
            <p className="mt-2 text-lg font-semibold" style={{ color: pl }}>
              Nombre tienda
            </p>
            <p className="mt-1 text-xs font-medium uppercase" style={{ color: ml }}>
              Organización
            </p>
            <p className="text-sm" style={{ color: ml }}>
              /slug
            </p>
            <p className="mt-2 text-sm font-medium" style={{ color: al }}>
              Acento
            </p>
          </div>
        </div>
        <div className="rounded-xl p-3 shadow-xs" style={{ background: sbd }}>
          <div
            className="rounded-lg p-4 shadow-xs"
            style={{
              background: ssd,
              borderWidth: 1,
              borderStyle: 'solid',
              borderColor: 'color-mix(in srgb, #fff 14%, transparent)',
            }}
          >
            <Text className="text-xs font-medium uppercase text-white/55">Vista oscura</Text>
            <p className="mt-2 text-lg font-semibold" style={{ color: pd }}>
              Nombre tienda
            </p>
            <p className="mt-1 text-xs font-medium uppercase" style={{ color: md }}>
              Organización
            </p>
            <p className="text-sm" style={{ color: md }}>
              /slug
            </p>
            <p className="mt-2 text-sm font-medium" style={{ color: ad }}>
              Acento
            </p>
          </div>
        </div>
      </div>

      {state.error ? (
        <Text className="text-red-600 dark:text-red-400" role="alert">
          {state.error}
        </Text>
      ) : null}
      {state.ok ? (
        <Text className="text-emerald-700 dark:text-emerald-400" role="status">
          Cambios guardados.
        </Text>
      ) : null}

      <Button type="submit" color="dark/zinc" disabled={pending}>
        {pending ? 'Guardando…' : 'Guardar marca'}
      </Button>
    </form>
  )
}
