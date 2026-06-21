'use server'

import { revalidatePath } from 'next/cache'
import {
  assertPermission,
  permissionDeniedState,
} from '@/lib/auth/access'
import {
  getRolesPermissionsByOrganizationId,
  isMemberPropietario,
  updateRolePermissions,
} from '@/lib/data/member-permissions'
import {
  isLockedRoleSlug,
  isManageableByPropietarioRoleSlug,
  PERMISSION_ACTIONS,
  PERMISSION_VIEWS,
  buildPermissionCode,
  getAllViewPermissionCodes,
  type PermissionAction,
} from '@/lib/permissions/views'

export interface RolePermissionsFormState {
  error: string | null
  ok: boolean
}

function parseRolePermissionsForm(formData: FormData): {
  error: string
} | {
  roleId: string
  permissionCodes: string[]
} {
  const roleId = String(formData.get('roleId') ?? '').trim()
  if (!roleId) {
    return { error: 'Rol no especificado.' }
  }

  const allowed = new Set(getAllViewPermissionCodes())
  const permissionCodes: string[] = []

  for (const view of PERMISSION_VIEWS) {
    for (const action of PERMISSION_ACTIONS) {
      const code = buildPermissionCode(view.id, action)
      const fieldName = `perm_${code.replace(/\./g, '_')}`
      if (formData.get(fieldName) === 'on' && allowed.has(code)) {
        permissionCodes.push(code)
      }
    }
  }

  return { roleId, permissionCodes }
}

export async function updateRolePermissionsAction(
  orgSlug: string,
  _prevState: RolePermissionsFormState,
  formData: FormData
): Promise<RolePermissionsFormState> {
  try {
    const access = await assertPermission(orgSlug, 'roles', 'view')
    const isPropietario = await isMemberPropietario(
      access.memberId,
      access.organization.id
    )

    if (!isPropietario) {
      return permissionDeniedState('Solo el propietario puede editar permisos de roles.')
    }

    const parsed = parseRolePermissionsForm(formData)

    if ('error' in parsed) {
      return { error: parsed.error, ok: false }
    }

    const snapshot = await getRolesPermissionsByOrganizationId(access.organization.id)
    const role = snapshot.roles.find((item) => item.id === parsed.roleId)

    if (!role) {
      return { error: 'Rol no encontrado.', ok: false }
    }

    if (isLockedRoleSlug(role.slug)) {
      return { error: 'Los permisos de Propietario no se pueden modificar.', ok: false }
    }

    if (!isManageableByPropietarioRoleSlug(role.slug)) {
      return { error: 'Este rol no se puede modificar.', ok: false }
    }

    const result = await updateRolePermissions(
      access.organization.id,
      parsed.roleId,
      parsed.permissionCodes
    )

    if (result.error) {
      return { error: result.error, ok: false }
    }

    revalidatePath(`/${orgSlug}/roles`)
    revalidatePath(`/${orgSlug}`, 'layout')

    return { error: null, ok: true }
  } catch (error) {
    if (error instanceof Error && error.name === 'PermissionDeniedError') {
      return permissionDeniedState(error.message)
    }
    console.error('updateRolePermissionsAction', error)
    return { error: 'No se pudieron guardar los permisos.', ok: false }
  }
}

export type PermissionActionForExport = PermissionAction
