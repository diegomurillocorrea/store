'use client'

import {
  ArchiveBoxIcon,
  ArrowsRightLeftIcon,
  BanknotesIcon,
  BuildingLibraryIcon,
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
  SidebarHeader,
  SidebarHeading,
  SidebarItem,
  SidebarLabel,
  SidebarSection,
} from '@/styles/catalyst-ui-kit/sidebar'
import { SidebarLayout } from '@/styles/catalyst-ui-kit/sidebar-layout'
import type { OrganizationBranding } from '@/lib/theme/branding'

interface OrgDashboardShellProps {
  orgSlug: string
  orgName: string
  branding: OrganizationBranding
  children: React.ReactNode
}

const navItemIsCurrent = (pathname: string, href: string, base: string) => {
  if (pathname === href) return true
  if (href === `${base}/dashboard` && pathname === base) return true
  return pathname.startsWith(`${href}/`)
}

export function OrgDashboardShell({ orgSlug, orgName, branding, children }: OrgDashboardShellProps) {
  const pathname = usePathname()
  const base = `/${orgSlug}`

  const NavLink = ({
    href,
    label,
    icon: Icon,
  }: {
    href: string
    label: string
    icon: React.ComponentType<{ className?: string; 'data-slot'?: string }>
  }) => (
    <SidebarItem href={href} current={navItemIsCurrent(pathname, href, base)}>
      <Icon data-slot="icon" />
      <SidebarLabel>{label}</SidebarLabel>
    </SidebarItem>
  )

  const sidebar = (
    <div className="flex h-full flex-col border-border bg-surface pt-5 pr-2 pb-4 pl-6 lg:border-r">
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
              <span
                className="truncate text-base/6 font-semibold"
                style={{ color: 'var(--org-brand-primary)' }}
              >
                {orgName}
              </span>
              <span className="org-brand-muted-text truncate text-xs">/{orgSlug}</span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarBody>
          <SidebarSection>
            <NavLink href={`${base}/dashboard`} label="Inicio" icon={HomeIcon} />
          </SidebarSection>

          <SidebarDivider />

          <SidebarSection>
            <SidebarHeading>Operación</SidebarHeading>
            <NavLink href={`${base}/pos`} label="Punto de venta" icon={ComputerDesktopIcon} />
            <NavLink href={`${base}/caja`} label="Caja" icon={BanknotesIcon} />
          </SidebarSection>

          <SidebarSection>
            <SidebarHeading>Catálogo</SidebarHeading>
            <NavLink href={`${base}/productos`} label="Productos" icon={CubeIcon} />
            <NavLink href={`${base}/categorias`} label="Categorías" icon={FolderIcon} />
          </SidebarSection>

          <SidebarSection>
            <SidebarHeading>Inventario</SidebarHeading>
            <NavLink href={`${base}/inventario`} label="Existencias" icon={ArchiveBoxIcon} />
            <NavLink href={`${base}/movimientos`} label="Movimientos" icon={ArrowsRightLeftIcon} />
          </SidebarSection>

          <SidebarSection>
            <SidebarHeading>Personas</SidebarHeading>
            <NavLink href={`${base}/clientes`} label="Clientes" icon={UsersIcon} />
            <NavLink href={`${base}/proveedores`} label="Proveedores" icon={BuildingStorefrontIcon} />
            <NavLink href={`${base}/empleados`} label="Empleados" icon={UserGroupIcon} />
            <NavLink href={`${base}/roles`} label="Roles y permisos" icon={ShieldCheckIcon} />
          </SidebarSection>

          <SidebarSection>
            <SidebarHeading>Finanzas</SidebarHeading>
            <NavLink href={`${base}/cuentas-por-cobrar`} label="Cuentas por cobrar" icon={CurrencyDollarIcon} />
            <NavLink href={`${base}/cuentas-por-pagar`} label="Cuentas por pagar" icon={BuildingLibraryIcon} />
          </SidebarSection>

          <SidebarDivider />

          <SidebarSection>
            <SidebarHeading>Sistema</SidebarHeading>
            <NavLink href={`${base}/configuracion/marca`} label="Marca y colores" icon={SwatchIcon} />
          </SidebarSection>
        </SidebarBody>
      </Sidebar>
    </div>
  )

  const navbar = (
    <Navbar>
      <NavbarSection className="min-w-0 lg:hidden">
        <span
          className="truncate text-sm font-semibold"
          style={{ color: 'var(--org-brand-primary)' }}
        >
          {orgName}
        </span>
      </NavbarSection>
      <NavbarSpacer />
      <NavbarSection>
        <NavbarItem href="/orgs" aria-label="Mis organizaciones">
          <span className="max-lg:hidden font-medium text-[color:var(--org-brand-accent)]">
            Organizaciones
          </span>
        </NavbarItem>
        <SignOutButton />
      </NavbarSection>
    </Navbar>
  )

  return (
    <SidebarLayout navbar={navbar} sidebar={sidebar}>
      {children}
    </SidebarLayout>
  )
}
