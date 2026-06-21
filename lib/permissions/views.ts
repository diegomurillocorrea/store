export const PERMISSION_ACTIONS = ['view', 'create', 'edit', 'delete'] as const

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number]

export interface PermissionViewDefinition {
  id: string
  label: string
  path: string
  section: string
}

export const PERMISSION_VIEWS: PermissionViewDefinition[] = [
  { id: 'dashboard', label: 'Inicio', path: '/dashboard', section: 'General' },
  { id: 'pos', label: 'Punto de venta', path: '/pos', section: 'Operación' },
  { id: 'caja', label: 'Caja', path: '/caja', section: 'Operación' },
  { id: 'productos', label: 'Productos', path: '/productos', section: 'Catálogo' },
  { id: 'categorias', label: 'Categorías', path: '/categorias', section: 'Catálogo' },
  { id: 'inventario', label: 'Existencias', path: '/inventario', section: 'Inventario' },
  { id: 'movimientos', label: 'Movimientos', path: '/movimientos', section: 'Inventario' },
  { id: 'clientes', label: 'Clientes', path: '/clientes', section: 'Personas' },
  { id: 'proveedores', label: 'Proveedores', path: '/proveedores', section: 'Personas' },
  { id: 'empleados', label: 'Empleados', path: '/empleados', section: 'Personas' },
  { id: 'roles', label: 'Roles y permisos', path: '/roles', section: 'Personas' },
  { id: 'cuentas-por-cobrar', label: 'Cuentas por cobrar', path: '/cuentas-por-cobrar', section: 'Finanzas' },
  { id: 'cuentas-por-pagar', label: 'Cuentas por pagar', path: '/cuentas-por-pagar', section: 'Finanzas' },
  { id: 'configuracion', label: 'Marca y colores', path: '/configuracion/marca', section: 'Sistema' },
]

export type PermissionViewId = (typeof PERMISSION_VIEWS)[number]['id']

export const PERMISSION_ACTION_LABELS: Record<PermissionAction, string> = {
  view: 'Ver',
  create: 'Crear',
  edit: 'Editar',
  delete: 'Eliminar',
}

export const ROLE_SLUGS = {
  propietario: 'propietario',
  administrador: 'administrador',
  vendedor: 'vendedor',
} as const

export type RoleSlug = (typeof ROLE_SLUGS)[keyof typeof ROLE_SLUGS]

export const SYSTEM_ROLE_SLUGS: RoleSlug[] = [
  ROLE_SLUGS.propietario,
  ROLE_SLUGS.administrador,
  ROLE_SLUGS.vendedor,
]

export const LOCKED_ROLE_SLUGS = new Set<RoleSlug>([ROLE_SLUGS.propietario])

export const ASSIGNABLE_EMPLOYEE_ROLE_SLUGS: RoleSlug[] = [
  ROLE_SLUGS.administrador,
  ROLE_SLUGS.vendedor,
]

export const MANAGEABLE_BY_PROPIETARIO_ROLE_SLUGS = new Set<RoleSlug>(ASSIGNABLE_EMPLOYEE_ROLE_SLUGS)

export function isLockedRoleSlug(slug: string): slug is RoleSlug {
  return LOCKED_ROLE_SLUGS.has(slug as RoleSlug)
}

export function isManageableByPropietarioRoleSlug(slug: string): slug is RoleSlug {
  return MANAGEABLE_BY_PROPIETARIO_ROLE_SLUGS.has(slug as RoleSlug)
}

export const DEFAULT_VENDEDOR_PERMISSIONS: string[] = [
  'dashboard.view',
  'pos.view',
  'pos.create',
  'pos.edit',
  'caja.view',
  'caja.create',
  'caja.edit',
  'productos.view',
  'categorias.view',
  'inventario.view',
  'movimientos.view',
  'clientes.view',
  'clientes.create',
  'clientes.edit',
]

export function buildPermissionCode(viewId: string, action: PermissionAction): string {
  return `${viewId}.${action}`
}

export function getAllViewPermissionCodes(): string[] {
  return PERMISSION_VIEWS.flatMap((view) =>
    PERMISSION_ACTIONS.map((action) => buildPermissionCode(view.id, action))
  )
}

export function hasPermission(
  permissions: ReadonlySet<string> | readonly string[],
  viewId: string,
  action: PermissionAction = 'view'
): boolean {
  const set = permissions instanceof Set ? permissions : new Set(permissions)
  return set.has(buildPermissionCode(viewId, action))
}

export interface ViewActionFlags {
  canView: boolean
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
}

export function getViewActionFlags(
  permissions: ReadonlySet<string> | readonly string[],
  viewId: PermissionViewId
): ViewActionFlags {
  return {
    canView: hasPermission(permissions, viewId, 'view'),
    canCreate: hasPermission(permissions, viewId, 'create'),
    canEdit: hasPermission(permissions, viewId, 'edit'),
    canDelete: hasPermission(permissions, viewId, 'delete'),
  }
}

export function getViewIdFromPathname(orgSlug: string, pathname: string): PermissionViewId | null {
  const base = `/${orgSlug}`
  const relative = pathname === base ? '/dashboard' : pathname.slice(base.length) || '/dashboard'

  const match = PERMISSION_VIEWS.find((view) => {
    if (relative === view.path) return true
    return relative.startsWith(`${view.path}/`)
  })

  return match?.id ?? null
}
