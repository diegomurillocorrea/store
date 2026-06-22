'use client'

import {
  ArchiveBoxIcon,
  ArrowsRightLeftIcon,
  BanknotesIcon,
  BuildingLibraryIcon,
  BuildingOffice2Icon,
  BuildingStorefrontIcon,
  ComputerDesktopIcon,
  CubeIcon,
  CurrencyDollarIcon,
  FolderIcon,
  HomeIcon,
  ShieldCheckIcon,
  SwatchIcon,
  UserGroupIcon,
  UsersIcon,
} from '@heroicons/react/24/outline'
import { OrgBrandLogo } from '@/components/org-brand-logo'
import { ThemeToggle } from '@/components/theme-toggle'
import { SidebarUserProfile } from '@/components/sidebar-user-profile'
import { SignOutButton } from '@/components/sign-out-button'
import {
  Sidebar,
  SidebarBody,
  SidebarDivider,
  SidebarHeading,
  SidebarItem,
  SidebarLabel,
  SidebarSection,
} from '@/styles/catalyst-ui-kit/sidebar'
import { SidebarLayout } from '@/styles/catalyst-ui-kit/sidebar-layout'
import type { OrganizationBranding } from '@/lib/theme/branding'
import { hasPermission, type PermissionViewId } from '@/lib/permissions/views'

interface OrgDashboardShellProps {
  orgSlug: string
  orgName: string
  userEmail: string
  branding: OrganizationBranding
  permissions: string[]
  pathname: string
  children: React.ReactNode
}

interface NavItemDefinition {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string; 'data-slot'?: string }>
  viewId: PermissionViewId
}

const navItemIsCurrent = (pathname: string, href: string, base: string) => {
  if (pathname === href) return true
  if (href === `${base}/dashboard` && pathname === base) return true
  return pathname.startsWith(`${href}/`)
}

function getMobilePageTitle(pathname: string, base: string, orgName: string): string {
  const titles: Record<string, string> = {
    [`${base}/dashboard`]: 'Inicio',
    [base]: 'Inicio',
    [`${base}/pos`]: 'Punto de venta',
    [`${base}/caja`]: 'Caja',
    [`${base}/productos`]: 'Productos',
    [`${base}/categorias`]: 'Categorías',
    [`${base}/inventario`]: 'Existencias',
    [`${base}/movimientos`]: 'Movimientos',
    [`${base}/clientes`]: 'Clientes',
    [`${base}/proveedores`]: 'Proveedores',
    [`${base}/empleados`]: 'Empleados',
    [`${base}/roles`]: 'Roles y permisos',
    [`${base}/cuentas-por-cobrar`]: 'Cuentas por cobrar',
    [`${base}/cuentas-por-pagar`]: 'Cuentas por pagar',
    [`${base}/configuracion/marca`]: 'Marca y colores',
  }

  if (titles[pathname]) return titles[pathname]

  for (const [href, title] of Object.entries(titles)) {
    if (pathname.startsWith(`${href}/`)) return title
  }

  return orgName
}

export function OrgDashboardShell({
  orgSlug,
  orgName,
  userEmail,
  branding,
  permissions,
  pathname,
  children,
}: OrgDashboardShellProps) {
  const base = `/${orgSlug}`
  const isPosRoute = pathname === `${base}/pos`
  const permissionSet = new Set(permissions)
  const mobileTitle = getMobilePageTitle(pathname, base, orgName)

  const canAccessView = (viewId: PermissionViewId) => hasPermission(permissionSet, viewId, 'view')

  const NavLink = ({
    href,
    label,
    icon: Icon,
  }: Omit<NavItemDefinition, 'viewId'>) => (
    <SidebarItem href={href} current={navItemIsCurrent(pathname, href, base)}>
      <Icon data-slot="icon" />
      <SidebarLabel>{label}</SidebarLabel>
    </SidebarItem>
  )

  const renderNavLinks = (items: NavItemDefinition[]) =>
    items
      .filter((item) => canAccessView(item.viewId))
      .map((item) => (
        <NavLink key={item.href} href={item.href} label={item.label} icon={item.icon} />
      ))

  const operationLinks: NavItemDefinition[] = [
    { href: `${base}/pos`, label: 'Punto de venta', icon: ComputerDesktopIcon, viewId: 'pos' },
    { href: `${base}/caja`, label: 'Caja', icon: BanknotesIcon, viewId: 'caja' },
  ]

  const catalogLinks: NavItemDefinition[] = [
    { href: `${base}/productos`, label: 'Productos', icon: CubeIcon, viewId: 'productos' },
    { href: `${base}/categorias`, label: 'Categorías', icon: FolderIcon, viewId: 'categorias' },
  ]

  const inventoryLinks: NavItemDefinition[] = [
    { href: `${base}/inventario`, label: 'Existencias', icon: ArchiveBoxIcon, viewId: 'inventario' },
    { href: `${base}/movimientos`, label: 'Movimientos', icon: ArrowsRightLeftIcon, viewId: 'movimientos' },
  ]

  const peopleLinks: NavItemDefinition[] = [
    { href: `${base}/clientes`, label: 'Clientes', icon: UsersIcon, viewId: 'clientes' },
    { href: `${base}/proveedores`, label: 'Proveedores', icon: BuildingStorefrontIcon, viewId: 'proveedores' },
    { href: `${base}/empleados`, label: 'Empleados', icon: UserGroupIcon, viewId: 'empleados' },
    { href: `${base}/roles`, label: 'Roles y permisos', icon: ShieldCheckIcon, viewId: 'roles' },
  ]

  const financeLinks: NavItemDefinition[] = [
    {
      href: `${base}/cuentas-por-cobrar`,
      label: 'Cuentas por cobrar',
      icon: CurrencyDollarIcon,
      viewId: 'cuentas-por-cobrar',
    },
    {
      href: `${base}/cuentas-por-pagar`,
      label: 'Cuentas por pagar',
      icon: BuildingLibraryIcon,
      viewId: 'cuentas-por-pagar',
    },
  ]

  const systemLinks: NavItemDefinition[] = [
    {
      href: `${base}/configuracion/marca`,
      label: 'Marca y colores',
      icon: SwatchIcon,
      viewId: 'configuracion',
    },
  ]

  const sidebar = (
    <div className="glass-surface flex h-full flex-col pt-5 pr-2 pb-4 pl-6 lg:mr-2 lg:rounded-r-2xl">
      <Sidebar className="flex h-full min-h-0 flex-col">
        <div
          className="flex flex-col border-b pb-4"
          style={{
            borderBottomColor: 'color-mix(in srgb, var(--org-brand-accent) 45%, transparent)',
          }}
        >
          <div className="flex h-16 shrink-0 items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              {branding.logoUrl ? (
                <OrgBrandLogo logoUrl={branding.logoUrl} orgName={orgName} />
              ) : (
                <span className="text-base/6 font-semibold text-zinc-900 dark:text-zinc-100">{orgName}</span>
              )}
            </div>
            <ThemeToggle />
          </div>
          <div className="mt-2 flex flex-col gap-0.5 px-0.5">
            <span className="org-brand-muted-text text-xs/6 font-semibold tracking-wide uppercase">
              Organización
            </span>
            <span className="truncate text-sm/6 font-semibold text-zinc-900 dark:text-zinc-100">
              {orgName}
            </span>
            <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">/{orgSlug}</span>
          </div>
        </div>

        <SidebarBody className="flex-1 overflow-y-auto px-0 py-4">
        {canAccessView('dashboard') ? (
          <SidebarSection>
            <NavLink href={`${base}/dashboard`} label="Inicio" icon={HomeIcon} />
          </SidebarSection>
        ) : null}

        {renderNavLinks(operationLinks).length > 0 ? (
          <>
            <SidebarDivider />
            <SidebarSection>
              <SidebarHeading>Operación</SidebarHeading>
              {renderNavLinks(operationLinks)}
            </SidebarSection>
          </>
        ) : null}

        {renderNavLinks(catalogLinks).length > 0 ? (
          <SidebarSection>
            <SidebarHeading>Catálogo</SidebarHeading>
            {renderNavLinks(catalogLinks)}
          </SidebarSection>
        ) : null}

        {renderNavLinks(inventoryLinks).length > 0 ? (
          <SidebarSection>
            <SidebarHeading>Inventario</SidebarHeading>
            {renderNavLinks(inventoryLinks)}
          </SidebarSection>
        ) : null}

        {renderNavLinks(peopleLinks).length > 0 ? (
          <SidebarSection>
            <SidebarHeading>Personas</SidebarHeading>
            {renderNavLinks(peopleLinks)}
          </SidebarSection>
        ) : null}

        {renderNavLinks(financeLinks).length > 0 ? (
          <SidebarSection>
            <SidebarHeading>Finanzas</SidebarHeading>
            {renderNavLinks(financeLinks)}
          </SidebarSection>
        ) : null}

        {renderNavLinks(systemLinks).length > 0 ? (
          <>
            <SidebarDivider />
            <SidebarSection>
              <SidebarHeading>Sistema</SidebarHeading>
              {renderNavLinks(systemLinks)}
            </SidebarSection>
          </>
        ) : null}
        </SidebarBody>

        <div className="mt-auto flex flex-col border-t border-zinc-950/5 pt-4 dark:border-white/5">
          <SidebarSection>
            <SidebarItem href="/orgs">
              <BuildingOffice2Icon data-slot="icon" aria-hidden="true" />
              <SidebarLabel>Mis organizaciones</SidebarLabel>
            </SidebarItem>
            <SignOutButton variant="sidebar" />
          </SidebarSection>
          <div className="-mx-2 mt-2 hidden border-t border-zinc-950/5 px-2 py-3 lg:block dark:border-white/5">
            <SidebarUserProfile email={userEmail} />
          </div>
        </div>
      </Sidebar>
    </div>
  )

  return (
    <SidebarLayout
      sidebar={sidebar}
      mobileTitle={mobileTitle}
      mobileActions={<SidebarUserProfile email={userEmail} compact />}
      panelWallpaperUrl={branding.panelWallpaperUrl}
      reserveSecondaryColumn={isPosRoute}
      contentWidth={isPosRoute ? 'full' : 'constrained'}
      contentPadding={isPosRoute ? 'none' : 'default'}
    >
      {children}
    </SidebarLayout>
  )
}
