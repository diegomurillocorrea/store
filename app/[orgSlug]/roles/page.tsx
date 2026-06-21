import { notFound } from 'next/navigation'
import { RolesPermissionsPanel } from '@/components/roles/roles-permissions-panel'
import { requireViewAccess } from '@/lib/auth/access'
import {
  ensureOrganizationRolesSeeded,
  getRolesPermissionsByOrganizationId,
  isMemberPropietario,
} from '@/lib/data/member-permissions'
import { Heading } from '@/styles/catalyst-ui-kit/heading'
import { Text } from '@/styles/catalyst-ui-kit/text'

interface RolesPageProps {
  params: Promise<{ orgSlug: string }>
}

export default async function RolesPage({ params }: RolesPageProps) {
  const { orgSlug } = await params
  const access = await requireViewAccess(orgSlug, 'roles')
  await ensureOrganizationRolesSeeded(access.organization.id)

  const [snapshot, canManageRoles] = await Promise.all([
    getRolesPermissionsByOrganizationId(access.organization.id),
    isMemberPropietario(access.memberId, access.organization.id),
  ])

  if (snapshot.roles.length === 0) {
    notFound()
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <Heading>Roles y permisos</Heading>
      <Text className="mt-2 max-w-3xl">
        Propietario, Administrador y Vendedor. Solo el propietario puede editar los permisos
        de administrador y vendedor por vista.
      </Text>
      <RolesPermissionsPanel
        orgSlug={orgSlug}
        roles={snapshot.roles}
        canManageRoles={canManageRoles}
      />
    </div>
  )
}
