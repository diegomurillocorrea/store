'use client'

import type { SocialLinks } from '@/lib/organization/profile-types'
import { Field, FieldGroup, Fieldset, Label } from '@/styles/catalyst-ui-kit/fieldset'
import { Input } from '@/styles/catalyst-ui-kit/input'
import { Subheading } from '@/styles/catalyst-ui-kit/heading'
import { Text } from '@/styles/catalyst-ui-kit/text'

const SOCIAL_FIELDS = [
  { key: 'website', label: 'Sitio web', placeholder: 'https://tutienda.com' },
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/tutienda' },
  { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/tutienda' },
  { key: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@tutienda' },
  { key: 'whatsapp', label: 'WhatsApp', placeholder: 'https://wa.me/521234567890' },
  { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@tutienda' },
  { key: 'x', label: 'X (Twitter)', placeholder: 'https://x.com/tutienda' },
] as const

interface SocialLinksFieldsProps {
  links: SocialLinks
  onChange: (links: SocialLinks) => void
  disabled?: boolean
}

export function SocialLinksFields({ links, onChange, disabled = false }: SocialLinksFieldsProps) {
  const updateLink = (key: keyof SocialLinks, value: string) => {
    onChange({ ...links, [key]: value })
  }

  return (
    <div>
      <Subheading level={3}>Redes sociales</Subheading>
      <Text className="mt-1 max-w-2xl text-sm">
        Enlaces públicos de la sucursal. Déjalos vacíos si no aplican.
      </Text>
      <Fieldset className="mt-4">
        <FieldGroup>
          {SOCIAL_FIELDS.map((field) => (
            <Field key={field.key}>
              <Label htmlFor={`social_${field.key}`}>{field.label}</Label>
              <Input
                id={`social_${field.key}`}
                name={`social_${field.key}`}
                type="url"
                inputMode="url"
                placeholder={field.placeholder}
                value={links[field.key] ?? ''}
                disabled={disabled}
                onChange={(e) => updateLink(field.key, e.target.value)}
              />
            </Field>
          ))}
        </FieldGroup>
      </Fieldset>
    </div>
  )
}
