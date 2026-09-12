'use client'

import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from '@headlessui/react'
import { ChevronDownIcon } from '@heroicons/react/20/solid'
import { useEffect, useMemo, useState } from 'react'
import { ProductOptionCombobox } from '@/components/productos/product-option-combobox'
import { RemovableTagBadge } from '@/components/productos/removable-tag-badge'
import type { ProductOption, TagProductOption } from '@/lib/data/product-types'
import { Field, Label } from '@/styles/catalyst-ui-kit/fieldset'

interface CategoryTagFieldsProps {
  idPrefix: string
  categories: ProductOption[]
  tags: TagProductOption[]
  defaultCategoryId?: string | null
  defaultTagIds?: string[]
  resetKey?: boolean | string | number
}

type SelectedTag = {
  id: string | null
  name: string
}

function normalizeTagName(name: string): string {
  return name.trim().toLowerCase()
}

function selectedTagsFromIds(
  tags: TagProductOption[],
  tagIds: string[]
): SelectedTag[] {
  return tagIds.flatMap((tagId) => {
    const match = tags.find((tag) => tag.id === tagId)
    return match ? [{ id: match.id, name: match.name }] : []
  })
}

function hasTagName(tags: SelectedTag[], name: string): boolean {
  const normalized = normalizeTagName(name)
  return tags.some((tag) => normalizeTagName(tag.name) === normalized)
}

export function CategoryTagFields({
  idPrefix,
  categories,
  tags,
  defaultCategoryId,
  defaultTagIds = [],
  resetKey,
}: CategoryTagFieldsProps) {
  const resolvedDefaultCategoryId = defaultCategoryId ?? null
  const resolvedDefaultTagIds = defaultTagIds ?? []
  const defaultTagIdsKey = resolvedDefaultTagIds.join(',')
  const [query, setQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<SelectedTag[]>(() =>
    selectedTagsFromIds(tags, resolvedDefaultTagIds)
  )

  useEffect(() => {
    setSelectedTags(selectedTagsFromIds(tags, resolvedDefaultTagIds))
    setQuery('')
  }, [defaultTagIdsKey, resetKey])

  const availableTags = useMemo(
    () =>
      tags.filter(
        (tag) => !selectedTags.some((selected) => selected.id === tag.id)
      ),
    [tags, selectedTags]
  )

  const trimmedQuery = query.trim()
  const filteredTags =
    trimmedQuery === ''
      ? availableTags
      : availableTags.filter((tag) =>
          tag.name.toLowerCase().includes(trimmedQuery.toLowerCase())
        )

  const canCreateTag =
    trimmedQuery.length >= 2 &&
    !hasTagName(tags, trimmedQuery) &&
    !hasTagName(selectedTags, trimmedQuery)

  const addTag = (tag: SelectedTag) => {
    const name = tag.name.trim()
    if (name.length < 2) return
    if (hasTagName(selectedTags, name)) return
    if (tag.id && selectedTags.some((selected) => selected.id === tag.id)) return

    setSelectedTags((current) => [...current, { id: tag.id, name }])
  }

  const removeTag = (tag: SelectedTag) => {
    setSelectedTags((current) =>
      current.filter((selected) =>
        tag.id
          ? selected.id !== tag.id
          : selected.id != null || normalizeTagName(selected.name) !== normalizeTagName(tag.name)
      )
    )
  }

  const inputId = `${idPrefix}-tags`

  return (
    <div className="flex flex-col gap-8">
      <ProductOptionCombobox
        id={`${idPrefix}-category`}
        name="categoryId"
        label="Categoría"
        options={categories}
        defaultOptionId={resolvedDefaultCategoryId}
        emptyLabel="Sin categoría"
        resetKey={resetKey}
      />

      <Field>
        <Label htmlFor={inputId}>Etiquetas</Label>
        {selectedTags.map((tag) =>
          tag.id ? (
            <input key={`id-${tag.id}`} type="hidden" name="tagIds" value={tag.id} />
          ) : (
            <input key={`new-${tag.name}`} type="hidden" name="newTagNames" value={tag.name} />
          )
        )}
        <Combobox
          as="div"
          data-slot="control"
          value={null}
          onChange={(tag: SelectedTag | null) => {
            setQuery('')
            if (tag) addTag(tag)
          }}
        >
          <div className="relative">
            <ComboboxInput
              id={inputId}
              className="block w-full rounded-lg bg-white py-1.5 pr-10 pl-3 text-base text-foreground outline-1 -outline-offset-1 outline-zinc-300 placeholder:text-foreground/45 focus:outline-2 focus:-outline-offset-2 focus:outline-emerald-600 disabled:cursor-not-allowed disabled:opacity-60 sm:py-2 sm:text-sm/6 dark:bg-white/5 dark:outline-zinc-600 dark:focus:outline-emerald-500"
              onChange={(event) => setQuery(event.target.value)}
              onBlur={() => setQuery('')}
              displayValue={() => query}
              placeholder="Buscar o crear etiqueta"
              autoComplete="off"
            />
            <ComboboxButton className="absolute inset-y-0 right-0 flex items-center rounded-r-lg px-2 focus:outline-hidden">
              <ChevronDownIcon className="size-5 text-muted-foreground" aria-hidden="true" />
            </ComboboxButton>

            <ComboboxOptions
              transition
              anchor="bottom start"
              className="z-50 max-h-60 min-w-[var(--input-width)] overflow-auto rounded-lg bg-white py-1 text-base shadow-lg outline outline-black/5 [--anchor-gap:4px] data-closed:data-leave:opacity-0 data-leave:transition data-leave:duration-100 data-leave:ease-in sm:text-sm dark:bg-zinc-900 dark:outline-white/10"
            >
              {canCreateTag ? (
                <ComboboxOption
                  value={{ id: null, name: trimmedQuery }}
                  className="cursor-default px-3 py-2 text-foreground select-none data-focus:bg-emerald-600 data-focus:text-white data-focus:outline-hidden"
                >
                  {trimmedQuery}
                </ComboboxOption>
              ) : null}
              {filteredTags.map((tag) => (
                <ComboboxOption
                  key={tag.id}
                  value={tag}
                  className="cursor-default px-3 py-2 text-foreground select-none data-focus:bg-emerald-600 data-focus:text-white data-focus:outline-hidden"
                >
                  <span className="block truncate">{tag.name}</span>
                </ComboboxOption>
              ))}
              {!canCreateTag && filteredTags.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  {trimmedQuery.length > 0
                    ? 'No hay etiquetas que coincidan.'
                    : 'Escribe para crear una etiqueta.'}
                </div>
              ) : null}
            </ComboboxOptions>
          </div>
        </Combobox>

        {selectedTags.length > 0 ? (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {selectedTags.map((tag) => (
              <li key={tag.id ?? `new-${tag.name}`}>
                <RemovableTagBadge name={tag.name} onRemove={() => removeTag(tag)} />
              </li>
            ))}
          </ul>
        ) : null}
      </Field>
    </div>
  )
}
