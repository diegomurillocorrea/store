'use client'

import { Fragment, useActionState, useMemo } from 'react'
import {
  updateRolePermissionsAction,
  type RolePermissionsFormState,
} from '@/lib/actions/role-actions'
import type { RoleWithPermissions } from '@/lib/data/member-permissions'
import {
  buildPermissionCode,
  isLockedRoleSlug,
  isManageableByPropietarioRoleSlug,
  PERMISSION_ACTION_LABELS,
  PERMISSION_ACTIONS,
  PERMISSION_VIEWS,
  ROLE_SLUGS,
  SYSTEM_ROLE_SLUGS,
  type PermissionAction,
} from '@/lib/permissions/views'
import { Button } from '@/styles/catalyst-ui-kit/button'
import { Checkbox } from '@/styles/catalyst-ui-kit/checkbox'
import { Subheading } from '@/styles/catalyst-ui-kit/heading'
import { Text } from '@/styles/catalyst-ui-kit/text'

interface RolesPermissionsPanelProps {
  orgSlug: string
  roles: RoleWithPermissions[]
  canManageRoles: boolean
}

const initialState: RolePermissionsFormState = {
  error: null,
  ok: false,
}

function permissionFieldName(code: string) {
  return `perm_${code.replace(/\./g, '_')}`
}

function roleDescription(slug: string, canManageRoles: boolean): string {
  if (slug === ROLE_SLUGS.propietario) {
    return 'Dueño de la organización. Acceso completo; sus permisos no se modifican.'
  }
  if (slug === ROLE_SLUGS.administrador) {
    return canManageRoles
      ? 'Configura el acceso del administrador por vista.'
      : 'Acceso administrativo. Solo el propietario puede editar sus permisos.'
  }
  return canManageRoles
    ? 'Configura el acceso del vendedor por vista.'
    : 'Permisos del vendedor. Solo el propietario puede editarlos.'
}

function RolePermissionsGrid({
  role,
  canManageRoles,
  orgSlug,
}: {
  role: RoleWithPermissions
  canManageRoles: boolean
  orgSlug: string
}) {
  const isEditable =
    canManageRoles && isManageableByPropietarioRoleSlug(role.slug)
  const isLocked = isLockedRoleSlug(role.slug) || !isEditable
  const boundAction = updateRolePermissionsAction.bind(null, orgSlug)
  const [state, formAction, isPending] = useActionState(boundAction, initialState)

  const sections = useMemo(() => {
    const grouped = new Map<string, typeof PERMISSION_VIEWS>()

    for (const view of PERMISSION_VIEWS) {
      const current = grouped.get(view.section) ?? []
      current.push(view)
      grouped.set(view.section, current)
    }

    return [...grouped.entries()]
  }, [])

  return (
    <form action={formAction} className="mt-8">
      <input type="hidden" name="roleId" value={role.id} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Subheading level={3}>{role.name}</Subheading>
          <Text className="mt-1 max-w-2xl">
            {roleDescription(role.slug, canManageRoles)}
          </Text>
        </div>
        {!isLocked ? (
          <Button type="submit" color="dark/zinc" disabled={isPending}>
            {isPending ? 'Guardando…' : 'Guardar permisos'}
          </Button>
        ) : null}
      </div>

      {state.error ? (
        <Text className="mt-4 text-red-600 dark:text-red-400" role="alert">
          {state.error}
        </Text>
      ) : null}

      {state.ok ? (
        <Text className="mt-4 text-emerald-700 dark:text-emerald-400" role="status">
          Permisos guardados correctamente.
        </Text>
      ) : null}

      <div className="mt-6 overflow-x-auto rounded-xl ring-1 ring-zinc-950/10 dark:ring-white/10">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-zinc-50 dark:bg-white/5">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold text-foreground">
                Vista
              </th>
              {PERMISSION_ACTIONS.map((action) => (
                <th
                  key={action}
                  scope="col"
                  className="px-4 py-3 text-center font-semibold text-foreground"
                >
                  {PERMISSION_ACTION_LABELS[action as PermissionAction]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-950/5 dark:divide-white/10">
            {sections.map(([section, views]) => (
              <Fragment key={section}>
                <tr className="bg-zinc-50/70 dark:bg-white/[0.03]">
                  <td
                    colSpan={PERMISSION_ACTIONS.length + 1}
                    className="px-4 py-2 text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400"
                  >
                    {section}
                  </td>
                </tr>
                {views.map((view) => (
                  <tr key={view.id}>
                    <td className="px-4 py-3 font-medium text-foreground">{view.label}</td>
                    {PERMISSION_ACTIONS.map((action) => {
                      const code = buildPermissionCode(view.id, action)
                      const checked = role.permissions.has(code)
                      const fieldName = permissionFieldName(code)

                      return (
                        <td key={code} className="px-4 py-3 text-center">
                          <div className="flex justify-center">
                            <Checkbox
                              name={fieldName}
                              defaultChecked={checked}
                              disabled={isLocked}
                              aria-label={`${view.label}: ${PERMISSION_ACTION_LABELS[action]}`}
                            />
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </form>
  )
}

export function RolesPermissionsPanel({
  orgSlug,
  roles,
  canManageRoles,
}: RolesPermissionsPanelProps) {
  const rolesBySlug = new Map(roles.map((role) => [role.slug, role]))

  return (
    <div className="space-y-10">
      {SYSTEM_ROLE_SLUGS.map((slug) => {
        const role = rolesBySlug.get(slug)
        if (!role) {
          return slug === ROLE_SLUGS.vendedor ? (
            <Text key={slug}>No se encontró el rol Vendedor para esta organización.</Text>
          ) : null
        }

        return (
          <RolePermissionsGrid
            key={role.id}
            role={role}
            canManageRoles={canManageRoles}
            orgSlug={orgSlug}
          />
        )
      })}
    </div>
  )
}
