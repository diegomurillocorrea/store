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
import { usePathname } from 'next/navigation'
import { OrgBrandLogo } from '@/components/org-brand-logo'
import { SignOutButton } from '@/components/sign-out-button'
import { Navbar, NavbarItem, NavbarSection, NavbarSpacer } from '@/styles/catalyst-ui-kit/navbar'
import {
  Sidebar,
  SidebarBody,
  SidebarDivider,
  SidebarFooter,
  SidebarHeader,
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
  branding: OrganizationBranding
  permissions: string[]
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

export function OrgDashboardShell({
  orgSlug,
  orgName,
  branding,
  permissions,
  children,
}: OrgDashboardShellProps) {
  const pathname = usePathname()
  const base = `/${orgSlug}`
  const isPosRoute = pathname === `${base}/pos`
  const permissionSet = new Set(permissions)

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
      <Sidebar>
        <SidebarHeader
          className="border-b pb-4"
          style={{ borderColor: 'color-mix(in srgb, var(--org-brand-accent) 45%, transparent)' }}
        >
          <div className="flex flex-col gap-3 px-2">
            {branding.logoUrl ? <OrgBrandLogo logoUrl={branding.logoUrl} orgName={orgName} /> : null}
            <div className="flex flex-col gap-0.5">
              <span className="org-brand-muted-text text-xs font-medium tracking-wide uppercase">
                Organización
              </span>
              <span className="truncate text-base/6 font-semibold text-foreground">
                {orgName}
              </span>
              <span className="org-brand-muted-text truncate text-xs">/{orgSlug}</span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarBody>
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
        <SidebarFooter>
          <SidebarSection>
            <SidebarItem href="/orgs">
              <BuildingOffice2Icon data-slot="icon" aria-hidden="true" />
              <SidebarLabel>Mis organizaciones</SidebarLabel>
            </SidebarItem>
            <SignOutButton variant="sidebar" />
          </SidebarSection>
        </SidebarFooter>
      </Sidebar>
    </div>
  )

  const navbar = (
    <Navbar>
      <NavbarSection className="min-w-0 lg:hidden">
        <span className="truncate text-sm font-semibold text-foreground">
          {orgName}
        </span>
      </NavbarSection>
      <NavbarSpacer />
      <NavbarSection>
        <NavbarItem href="/orgs" aria-label="Mis organizaciones">
          <span className="max-lg:hidden font-medium text-foreground">
            Organizaciones
          </span>
        </NavbarItem>
        <SignOutButton />
      </NavbarSection>
    </Navbar>
  )

  return (
    <SidebarLayout
      navbar={navbar}
      panelWallpaperUrl={branding.panelWallpaperUrl}
      sidebar={sidebar}
      contentWidth={isPosRoute ? 'full' : 'constrained'}
      contentPadding={isPosRoute ? 'none' : 'default'}
    >
      {children}
    </SidebarLayout>
  )
}
