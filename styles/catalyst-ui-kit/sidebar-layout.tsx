'use client'

import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  TransitionChild,
} from '@headlessui/react'
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { useState } from 'react'
import { getProxiedLogoSrc } from '@/lib/theme/branding'

export const LAYOUT_SECONDARY_ASIDE_ID = 'layout-secondary-aside'

export interface SidebarLayoutProps {
  sidebar: React.ReactNode
  mobileTitle: string
  mobileActions?: React.ReactNode
  /** Imagen de fondo del área de contenido (configuración de marca) */
  panelWallpaperUrl?: string | null
  /** Reserva espacio y monta columna derecha fija (xl+) */
  reserveSecondaryColumn?: boolean
  contentWidth?: 'constrained' | 'full'
  contentPadding?: 'default' | 'none'
  children: React.ReactNode
}

export function SidebarLayout({
  sidebar,
  mobileTitle,
  mobileActions,
  panelWallpaperUrl,
  reserveSecondaryColumn = false,
  contentWidth = 'constrained',
  contentPadding = 'default',
  children,
}: SidebarLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const wallpaperSrc =
    panelWallpaperUrl && panelWallpaperUrl.trim().length > 0
      ? getProxiedLogoSrc(panelWallpaperUrl.trim())
      : null
  const panelGlassClass = wallpaperSrc ? 'glass-surface-wallpaper' : 'glass-surface'
  const contentWidthClass = contentWidth === 'full' ? 'max-w-none' : 'max-w-6xl'
  const innerContentPaddingClass =
    contentPadding === 'none' ? 'p-0' : 'p-6 lg:p-10'

  return (
    <>
      <div className="glass-shell relative isolate min-h-svh w-full">
        <Dialog
          open={sidebarOpen}
          onClose={setSidebarOpen}
          className="relative z-50 lg:hidden"
        >
          <DialogBackdrop
            transition
            className="fixed inset-0 bg-zinc-900/80 backdrop-blur-sm transition-opacity duration-300 ease-linear data-closed:opacity-0 dark:bg-black/70"
          />

          <div className="fixed inset-0 flex">
            <DialogPanel
              transition
              className="relative mr-16 flex w-full max-w-xs flex-1 transform transition duration-300 ease-in-out data-closed:-translate-x-full"
            >
              <TransitionChild>
                <div className="absolute top-0 left-full flex w-16 justify-center pt-5 duration-300 ease-in-out data-closed:opacity-0">
                  <button
                    type="button"
                    onClick={() => setSidebarOpen(false)}
                    className="-m-2.5 p-2.5"
                  >
                    <span className="sr-only">Cerrar menú</span>
                    <XMarkIcon aria-hidden="true" className="size-6 text-white" />
                  </button>
                </div>
              </TransitionChild>

              <div className="glass-surface flex grow flex-col overflow-y-auto rounded-2xl p-2">
                {sidebar}
              </div>
            </DialogPanel>
          </div>
        </Dialog>

        <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col lg:py-2 lg:pl-2">
          {sidebar}
        </div>

        <div className="glass-shell sticky top-0 z-40 flex items-center gap-x-6 border-b border-white/15 px-4 py-4 backdrop-blur-xl sm:px-6 lg:hidden dark:border-white/10">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="relative -m-2.5 p-2.5 text-zinc-700 dark:text-zinc-300"
          >
            <span className="sr-only">Abrir menú</span>
            <Bars3Icon aria-hidden="true" className="size-6" />
          </button>
          <div className="relative min-w-0 flex-1 truncate text-sm/6 font-semibold text-zinc-900 dark:text-zinc-100">
            {mobileTitle}
          </div>
          {mobileActions ? <div className="relative shrink-0">{mobileActions}</div> : null}
        </div>

        <main className="flex flex-1 flex-col pb-2 lg:min-w-0 lg:pt-2 lg:pr-2 lg:pl-72">
          <div
            className={clsx(
              'relative mx-2 mb-3 flex min-h-0 grow flex-col overflow-hidden rounded-2xl sm:mx-3 lg:mx-0 lg:mb-0',
              reserveSecondaryColumn && 'xl:mr-2'
            )}
          >
            <div className={clsx(reserveSecondaryColumn && 'xl:pr-96')}>
              <div className="relative flex min-h-[calc(100dvh-4.5rem)] flex-col overflow-hidden rounded-2xl lg:min-h-[calc(100dvh-1rem)]">
                {wallpaperSrc ? (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 z-0 bg-cover bg-center bg-no-repeat [transform:scale(1.08)]"
                    style={{ backgroundImage: `url(${JSON.stringify(wallpaperSrc)})` }}
                  />
                ) : null}
                <div
                  className={clsx(
                    'relative z-10 flex min-h-0 flex-1 flex-col rounded-2xl',
                    innerContentPaddingClass,
                    panelGlassClass
                  )}
                >
                  <div className={clsx('mx-auto min-h-0 w-full flex-1', contentWidthClass)}>
                    {children}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {reserveSecondaryColumn ? (
        <aside
          id={LAYOUT_SECONDARY_ASIDE_ID}
          aria-label="Panel lateral"
          className="glass-surface fixed inset-y-0 right-0 z-40 hidden w-96 overflow-y-auto border-l border-white/15 xl:block dark:border-white/10"
        />
      ) : null}
    </>
  )
}
