'use client'

import * as Headless from '@headlessui/react'
import React, { useState } from 'react'
import { getProxiedLogoSrc } from '@/lib/theme/branding'
import { NavbarItem } from './navbar'

function OpenMenuIcon() {
  return (
    <svg data-slot="icon" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M2 6.75C2 6.33579 2.33579 6 2.75 6H17.25C17.6642 6 18 6.33579 18 6.75C18 7.16421 17.6642 7.5 17.25 7.5H2.75C2.33579 7.5 2 7.16421 2 6.75ZM2 13.25C2 12.8358 2.33579 12.5 2.75 12.5H17.25C17.6642 12.5 18 12.8358 18 13.25C18 13.6642 17.6642 14 17.25 14H2.75C2.33579 14 2 13.6642 2 13.25Z" />
    </svg>
  )
}

function CloseMenuIcon() {
  return (
    <svg data-slot="icon" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
    </svg>
  )
}

function MobileSidebar({ open, close, children }: React.PropsWithChildren<{ open: boolean; close: () => void }>) {
  return (
    <Headless.Dialog open={open} onClose={close} className="lg:hidden">
      <Headless.DialogBackdrop
        transition
        className="fixed inset-0 bg-black/25 backdrop-blur-sm transition data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in dark:bg-black/45"
      />
      <Headless.DialogPanel
        transition
        className="fixed inset-y-0 w-full max-w-80 p-2 transition duration-300 ease-in-out data-closed:-translate-x-full"
      >
        <div className="glass-surface flex h-full flex-col rounded-2xl">
          <div className="-mb-3 px-4 pt-3">
            <Headless.CloseButton as={NavbarItem} aria-label="Close navigation">
              <CloseMenuIcon />
            </Headless.CloseButton>
          </div>
          {children}
        </div>
      </Headless.DialogPanel>
    </Headless.Dialog>
  )
}

export function SidebarLayout({
  navbar,
  sidebar,
  children,
  panelWallpaperUrl,
}: React.PropsWithChildren<{
  navbar: React.ReactNode
  sidebar: React.ReactNode
  /** Imagen de fondo del área de contenido (estilo WhatsApp) */
  panelWallpaperUrl?: string | null
}>) {
  let [showSidebar, setShowSidebar] = useState(false)

  const wallpaperSrc =
    panelWallpaperUrl && panelWallpaperUrl.trim().length > 0
      ? getProxiedLogoSrc(panelWallpaperUrl.trim())
      : null
  const panelGlassClass = wallpaperSrc ? 'glass-surface-wallpaper' : 'glass-surface'

  return (
    <div className="glass-shell relative isolate flex min-h-svh w-full max-lg:flex-col">
      {/* Sidebar on desktop */}
      <div className="fixed inset-y-0 left-0 w-64 max-lg:hidden">{sidebar}</div>

      {/* Sidebar on mobile */}
      <MobileSidebar open={showSidebar} close={() => setShowSidebar(false)}>
        {sidebar}
      </MobileSidebar>

      {/* Navbar on mobile */}
      <header className="glass-shell sticky top-0 z-30 flex items-center border-b border-white/15 px-4 backdrop-blur-xl dark:border-white/10 lg:hidden">
        <div className="py-2.5">
          <NavbarItem onClick={() => setShowSidebar(true)} aria-label="Open navigation">
            <OpenMenuIcon />
          </NavbarItem>
        </div>
        <div className="min-w-0 flex-1">{navbar}</div>
      </header>

      {/* Content */}
      <main className="flex flex-1 flex-col pb-2 lg:min-w-0 lg:pt-2 lg:pr-2 lg:pl-64">
        <div className="relative mx-2 mb-3 flex min-h-0 grow flex-col overflow-hidden rounded-2xl sm:mx-3 lg:mx-0 lg:mb-0 lg:rounded-2xl">
          {wallpaperSrc ? (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-0 bg-cover bg-center bg-no-repeat [transform:scale(1.08)]"
              style={{ backgroundImage: `url(${JSON.stringify(wallpaperSrc)})` }}
            />
          ) : null}
          <div
            className={`relative z-10 flex min-h-0 flex-1 flex-col rounded-2xl p-6 lg:p-10 ${panelGlassClass}`}
          >
            <div className="mx-auto min-h-0 w-full max-w-6xl flex-1">{children}</div>
          </div>
        </div>
      </main>
    </div>
  )
}
