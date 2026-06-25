import { redirect } from 'next/navigation'
import {
  buildPermissionCode,
  type PermissionAction,
  type PermissionViewId,
} from '@/lib/permissions/views'
import { getOrgMemberAccess, type OrgMemberAccess } from '@/lib/data/organizations'

export class PermissionDeniedError extends Error {
  constructor(message = 'No tienes permiso para realizar esta acción.') {
    super(message)
    this.name = 'PermissionDeniedError'
  }
}

export async function requireOrgMemberAccess(orgSlug: string): Promise<OrgMemberAccess> {
  const access = await getOrgMemberAccess(orgSlug)
  if (!access) {
    redirect('/sucursales?motivo=sin-acceso')
  }
  return access
}

export async function requireViewAccess(
  orgSlug: string,
  viewId: PermissionViewId,
  action: PermissionAction = 'view'
): Promise<OrgMemberAccess> {
  const access = await requireOrgMemberAccess(orgSlug)
  const code = buildPermissionCode(viewId, action)

  if (!access.permissions.has(code)) {
    redirect(`/${orgSlug}/dashboard?sin-acceso=${viewId}`)
  }

  return access
}

export async function assertPermission(
  orgSlug: string,
  viewId: PermissionViewId,
  action: PermissionAction
): Promise<OrgMemberAccess> {
  const access = await getOrgMemberAccess(orgSlug)
  if (!access) {
    throw new PermissionDeniedError('Sesión no válida o sin acceso a la organización.')
  }

  const code = buildPermissionCode(viewId, action)
  if (!access.permissions.has(code)) {
    throw new PermissionDeniedError()
  }

  return access
}

export async function getActionAccess(
  orgSlug: string,
  viewId: PermissionViewId,
  action: PermissionAction
): Promise<OrgMemberAccess | null> {
  try {
    return await assertPermission(orgSlug, viewId, action)
  } catch (error) {
    if (error instanceof PermissionDeniedError) {
      return null
    }
    throw error
  }
}

export function permissionDeniedState(message = 'No tienes permiso para realizar esta acción.') {
  return { error: message, ok: false as const }
}
