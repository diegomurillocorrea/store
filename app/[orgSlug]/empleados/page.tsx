import { EmployeesPanel } from '@/components/empleados/employees-panel'
import { requireViewAccess } from '@/lib/auth/access'
import { ensureOrganizationRolesSeeded } from '@/lib/data/member-permissions'
import { getEmployeesByOrganizationId } from '@/lib/data/employees'
import {
  getAssignableEmployeeRolesByOrganizationId,
  getPropietarioRoleByOrganizationId,
} from '@/lib/data/roles'
import { getViewActionFlags } from '@/lib/permissions/views'
import { Heading } from '@/styles/catalyst-ui-kit/heading'

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
    <div className="px-4 sm:px-6 lg:px-8">
      <Heading>Empleados</Heading>
      <EmployeesPanel
        orgSlug={orgSlug}
        employees={employees}
        assignableRoles={assignableRoles}
        propietarioRole={propietarioRole}
        actions={actions}
      />
    </div>
  )
}
