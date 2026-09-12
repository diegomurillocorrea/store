'use client'

import { MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/24/outline'
import { useMemo, useState } from 'react'
import { CreateTagDialog } from '@/components/etiquetas/create-tag-dialog'
import { DeleteTagDialog } from '@/components/etiquetas/delete-tag-dialog'
import { EditTagDialog } from '@/components/etiquetas/edit-tag-dialog'
import type { TagRow } from '@/lib/data/tags'
import {
  listActionsRowClass,
  listDescriptionClass,
  listEmptyWrapClass,
  listHeaderActionsClass,
  listSearchClass,
  listTableWrapClass,
  listTdActionsClass,
  listTdPrimaryClass,
  listThActionsClass,
  listThPrimaryClass,
} from '@/lib/ui/list-chrome'
import type { ViewActionFlags } from '@/lib/permissions/views'
import { Button } from '@/styles/catalyst-ui-kit/button'
import { Input, InputGroup } from '@/styles/catalyst-ui-kit/input'
import { Subheading } from '@/styles/catalyst-ui-kit/heading'
import { Text } from '@/styles/catalyst-ui-kit/text'

interface TagsPanelProps {
  orgSlug: string
  tags: TagRow[]
  actions: Pick<ViewActionFlags, 'canCreate' | 'canEdit' | 'canDelete'>
}

export function TagsPanel({ orgSlug, tags, actions }: TagsPanelProps) {
  const [query, setQuery] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<TagRow | null>(null)
  const [deletingTag, setDeletingTag] = useState<TagRow | null>(null)

  const filteredTags = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return tags
    return tags.filter((tag) => tag.name.toLowerCase().includes(normalizedQuery))
  }, [tags, query])

  return (
    <>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <Subheading level={3}>Listado de etiquetas</Subheading>
          <Text className={listDescriptionClass}>
            Etiqueta productos de forma independiente a la categoría. Un producto puede tener
            varias etiquetas.
          </Text>
        </div>
        <div className={listHeaderActionsClass}>
          {actions.canCreate ? (
            <Button type="button" color="dark/zinc" onClick={() => setIsCreateOpen(true)}>
              <PlusIcon data-slot="icon" aria-hidden="true" />
              Nueva etiqueta
            </Button>
          ) : null}
        </div>
      </div>

      <div className={listSearchClass}>
        <InputGroup>
          <MagnifyingGlassIcon data-slot="icon" aria-hidden="true" />
          <Input
            type="search"
            name="tag-search"
            placeholder="Buscar etiqueta"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Buscar etiqueta"
          />
        </InputGroup>
      </div>

      {filteredTags.length === 0 ? (
        <div className={listEmptyWrapClass}>
          <Subheading level={3}>
            {tags.length === 0 ? 'Sin etiquetas' : 'Sin resultados'}
          </Subheading>
          <Text className="mt-2">
            {tags.length === 0
              ? 'Crea tu primera etiqueta con el botón de arriba.'
              : 'Prueba con otro término de búsqueda.'}
          </Text>
        </div>
      ) : (
        <div className={listTableWrapClass}>
          <div className="overflow-x-auto">
            <table className="relative min-w-0 w-full divide-y divide-border">
              <thead>
                <tr>
                  <th scope="col" className={listThPrimaryClass}>
                    Nombre
                  </th>
                  <th scope="col" className={listThActionsClass}>
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredTags.map((tag) => (
                  <tr key={tag.id}>
                    <td className={`${listTdPrimaryClass} text-foreground!`}>
                      {tag.name}
                    </td>
                    <td className={listTdActionsClass}>
                      {actions.canEdit || actions.canDelete ? (
                        <div className={listActionsRowClass}>
                          {actions.canEdit ? (
                            <button
                              type="button"
                              onClick={() => setEditingTag(tag)}
                              className="text-emerald-600 hover:text-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 dark:text-emerald-400 dark:hover:text-emerald-300"
                            >
                              Editar
                              <span className="sr-only">, {tag.name}</span>
                            </button>
                          ) : null}
                          {actions.canDelete ? (
                            <button
                              type="button"
                              onClick={() => setDeletingTag(tag)}
                              className="text-red-600 hover:text-red-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 dark:text-red-400 dark:hover:text-red-300"
                            >
                              Eliminar
                              <span className="sr-only">, {tag.name}</span>
                            </button>
                          ) : null}
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CreateTagDialog
        orgSlug={orgSlug}
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />

      {editingTag ? (
        <EditTagDialog
          key={editingTag.id}
          orgSlug={orgSlug}
          tag={editingTag}
          open
          onClose={() => setEditingTag(null)}
        />
      ) : null}

      <DeleteTagDialog
        orgSlug={orgSlug}
        tag={deletingTag}
        open={deletingTag !== null}
        onClose={() => setDeletingTag(null)}
      />
    </>
  )
}
