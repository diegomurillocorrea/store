'use client'

import Script from 'next/script'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Field, Label } from '@/styles/catalyst-ui-kit/fieldset'
import { Input } from '@/styles/catalyst-ui-kit/input'
import { Subheading } from '@/styles/catalyst-ui-kit/heading'
import { Text } from '@/styles/catalyst-ui-kit/text'

const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? ''

interface LocationMapFieldProps {
  address: string
  lat: number | null
  lng: number | null
  onAddressChange: (value: string) => void
  onLatChange: (value: number | null) => void
  onLngChange: (value: number | null) => void
  disabled?: boolean
}

function buildMapEmbedSrc(
  address: string,
  lat: number | null,
  lng: number | null
): string | null {
  if (lat !== null && lng !== null) {
    if (googleMapsApiKey) {
      return `https://www.google.com/maps/embed/v1/view?key=${encodeURIComponent(googleMapsApiKey)}&center=${lat},${lng}&zoom=15`
    }
    const delta = 0.01
    return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - delta},${lat - delta},${lng + delta},${lat + delta}&layer=mapnik&marker=${lat},${lng}`
  }

  if (address.trim()) {
    const query = encodeURIComponent(address.trim())
    if (googleMapsApiKey) {
      return `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(googleMapsApiKey)}&q=${query}`
    }
    return `https://maps.google.com/maps?q=${query}&hl=es&z=15&output=embed`
  }

  return null
}

export function LocationMapField({
  address,
  lat,
  lng,
  onAddressChange,
  onLatChange,
  onLngChange,
  disabled = false,
}: LocationMapFieldProps) {
  const addressInputRef = useRef<HTMLInputElement>(null)
  const [mapsReady, setMapsReady] = useState(false)
  const embedSrc = useMemo(() => buildMapEmbedSrc(address, lat, lng), [address, lat, lng])

  const externalMapsHref = useMemo(() => {
    if (lat !== null && lng !== null) {
      return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    }
    if (address.trim()) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.trim())}`
    }
    return null
  }, [address, lat, lng])

  const initAutocomplete = useCallback(() => {
    if (!googleMapsApiKey || !mapsReady || !addressInputRef.current) return
    const googleMaps = (window as typeof window & {
      google?: {
        maps?: {
          places?: {
            Autocomplete: new (
              input: HTMLInputElement,
              opts?: { fields?: string[] }
            ) => {
              addListener: (event: string, handler: () => void) => void
              getPlace: () => {
                formatted_address?: string
                geometry?: { location?: { lat: () => number; lng: () => number } }
              }
            }
          }
        }
      }
    }).google

    if (!googleMaps?.maps?.places) return

    const autocomplete = new googleMaps.maps.places.Autocomplete(addressInputRef.current, {
      fields: ['formatted_address', 'geometry'],
    })

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace()
      const formatted = place.formatted_address?.trim()
      const location = place.geometry?.location
      if (formatted) onAddressChange(formatted)
      if (location) {
        onLatChange(location.lat())
        onLngChange(location.lng())
      }
    })
  }, [mapsReady, onAddressChange, onLatChange, onLngChange])

  useEffect(() => {
    initAutocomplete()
  }, [initAutocomplete])

  return (
    <div>
      {googleMapsApiKey ? (
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(googleMapsApiKey)}&libraries=places&loading=async`}
          strategy="lazyOnload"
          onReady={() => setMapsReady(true)}
        />
      ) : null}

      <Subheading level={3}>Ubicación</Subheading>
      <Text className="mt-1 max-w-2xl text-sm">
        Dirección de la sucursal y coordenadas para mostrarla en mapa.
        {googleMapsApiKey
          ? ' Escribe la dirección y elige una sugerencia de Google Maps.'
          : ' Agrega NEXT_PUBLIC_GOOGLE_MAPS_API_KEY para autocompletar direcciones.'}
      </Text>

      <div className="mt-4 space-y-4">
        <Field>
          <Label htmlFor="location_address">Dirección</Label>
          <Input
            ref={addressInputRef}
            id="location_address"
            name="location_address"
            type="text"
            value={address}
            disabled={disabled}
            placeholder="Calle, número, colonia, ciudad"
            onChange={(e) => onAddressChange(e.target.value)}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field>
            <Label htmlFor="location_lat">Latitud</Label>
            <Input
              id="location_lat"
              name="location_lat"
              type="number"
              step="any"
              inputMode="decimal"
              value={lat ?? ''}
              disabled={disabled}
              placeholder="19.4326"
              onChange={(e) => {
                const next = e.target.value.trim()
                onLatChange(next ? Number(next) : null)
              }}
            />
          </Field>
          <Field>
            <Label htmlFor="location_lng">Longitud</Label>
            <Input
              id="location_lng"
              name="location_lng"
              type="number"
              step="any"
              inputMode="decimal"
              value={lng ?? ''}
              disabled={disabled}
              placeholder="-99.1332"
              onChange={(e) => {
                const next = e.target.value.trim()
                onLngChange(next ? Number(next) : null)
              }}
            />
          </Field>
        </div>

        {embedSrc ? (
          <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700">
            <iframe
              title="Mapa de ubicación de la sucursal"
              src={embedSrc}
              className="h-64 w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
        ) : (
          <Text className="text-sm text-zinc-500 dark:text-zinc-400">
            Agrega una dirección o coordenadas para ver la vista previa del mapa.
          </Text>
        )}

        {externalMapsHref ? (
          <a
            href={externalMapsHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex text-sm font-medium text-emerald-700 hover:text-emerald-600 dark:text-emerald-300"
          >
            Abrir en Google Maps ↗
          </a>
        ) : null}
      </div>
    </div>
  )
}
