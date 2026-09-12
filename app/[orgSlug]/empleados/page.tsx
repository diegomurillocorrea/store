import { EmployeesPanel } from '@/components/empleados/employees-panel'
import { ListPageFrame } from '@/components/list-page-frame'
import { requireViewAccess } from '@/lib/auth/access'
import { ensureOrganizationRolesSeeded } from '@/lib/data/member-permissions'
import { getEmployeesByOrganizationId } from '@/lib/data/employees'
import {
  getAssignableEmployeeRolesByOrganizationId,
  getPropietarioRoleByOrganizationId,
} from '@/lib/data/roles'
import { getViewActionFlags } from '@/lib/permissions/views'

interface EmpleadosPageProps {
  params: Promise<{ orgSlug: string }>
}

export default async function EmpleadosPage({ params }: EmpleadosPageProps) {
  const { orgSlug } = await params
  const access = await requireViewAccess(orgSlug, 'empleados')
  const actions = getViewActionFlags(access.permissions, 'empleados')

  await ensureOrganizationRolesSeeded(access.organization.id)

  const [employees, assignableRoles, propietarioRole] = await Promise.all([
    getEmployeesByOrganizationId(access.organization.id),
    getAssignableEmployeeRolesByOrganizationId(access.organization.id),
    getPropietarioRoleByOrganizationId(access.organization.id),
  ])

  return (
    <ListPageFrame title="Empleados">
      <EmployeesPanel
        orgSlug={orgSlug}
        employees={employees}
        assignableRoles={assignableRoles}
        propietarioRole={propietarioRole}
        actions={actions}
      />
    </ListPageFrame>
  )
}
