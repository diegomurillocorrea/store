'use client'

import { BuildingOffice2Icon, PlusIcon } from '@heroicons/react/24/outline'
import { SidebarUserProfile } from '@/components/sidebar-user-profile'
import { SignOutButton } from '@/components/sign-out-button'
import { ThemeToggle } from '@/components/theme-toggle'
import {
  Sidebar,
  SidebarBody,
  SidebarFooter,
  SidebarHeader,
  SidebarItem,
  SidebarLabel,
  SidebarSection,
} from '@/styles/catalyst-ui-kit/sidebar'
import { SidebarLayout } from '@/styles/catalyst-ui-kit/sidebar-layout'

interface OrgsShellProps {
  userEmail: string
  children: React.ReactNode
}

export function OrgsShell({ userEmail, children }: OrgsShellProps) {
  const sidebar = (
    <div className="glass-surface flex h-full flex-col pt-5 pr-2 pb-4 pl-6 lg:mr-2 lg:rounded-r-2xl">
      <Sidebar className="flex h-full min-h-0 flex-col">
      <SidebarHeader className="border-b border-zinc-200 px-0 pb-4 dark:border-zinc-800">
        <div className="flex h-16 shrink-0 items-center justify-between gap-3">
          <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Store</span>
          <ThemeToggle />
        </div>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Elige un negocio o crea uno nuevo.
        </p>
      </SidebarHeader>

      <SidebarBody className="flex-1 px-0">
        <SidebarSection>
          <SidebarItem href="/sucursales" current>
            <BuildingOffice2Icon data-slot="icon" aria-hidden="true" />
            <SidebarLabel>Mis sucursales</SidebarLabel>
          </SidebarItem>
          <SidebarItem href="/sucursales/nueva">
            <PlusIcon data-slot="icon" aria-hidden="true" />
            <SidebarLabel>Nueva sucursal</SidebarLabel>
          </SidebarItem>
        </SidebarSection>
      </SidebarBody>

      <SidebarFooter className="mt-auto border-t border-zinc-200 px-0 dark:border-zinc-800">
        <SidebarSection>
          <SignOutButton variant="sidebar" />
        </SidebarSection>
        <div className="-mx-6 mt-2 hidden border-t border-zinc-200 px-6 py-3 lg:block dark:border-zinc-800">
          <SidebarUserProfile email={userEmail} />
        </div>
      </SidebarFooter>
      </Sidebar>
    </div>
  )

  return (
    <SidebarLayout
      sidebar={sidebar}
      mobileTitle="Mis sucursales"
      mobileActions={<SidebarUserProfile email={userEmail} compact />}
    >
      {children}
    </SidebarLayout>
  )
}
