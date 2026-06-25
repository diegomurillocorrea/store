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
import { OptimizedImage } from '@/components/optimized-image'
import { IMAGE_SIZES } from '@/lib/utils/image-src'

export const LAYOUT_SECONDARY_ASIDE_ID = 'layout-secondary-aside'

const SECONDARY_COLUMN_TRANSITION_MS = 300

export interface SidebarLayoutProps {
  sidebar: React.ReactNode
  mobileTitle: string
  mobileActions?: React.ReactNode
  /** Imagen de fondo del área de contenido (configuración de marca) */
  panelWallpaperUrl?: string | null
  /** Monta la columna derecha fija (lg+) */
  reserveSecondaryColumn?: boolean
  /** Controla visibilidad animada de la columna derecha */
  secondaryColumnOpen?: boolean
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
  secondaryColumnOpen,
  contentWidth = 'constrained',
  contentPadding = 'default',
  children,
}: SidebarLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const isSecondaryColumnOpen = secondaryColumnOpen ?? reserveSecondaryColumn

  const hasWallpaper =
    Boolean(panelWallpaperUrl && panelWallpaperUrl.trim().length > 0)
  const panelGlassClass = hasWallpaper ? 'glass-surface-wallpaper' : 'glass-surface'
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
              'relative mx-2 mb-3 flex min-h-0 grow flex-col overflow-hidden rounded-2xl transition-[margin-right] duration-300 ease-in-out sm:mx-3 lg:mx-0 lg:mb-0',
              reserveSecondaryColumn && isSecondaryColumnOpen && 'lg:mr-2'
            )}
          >
            <div
              className={clsx(
                'transition-[padding-right] duration-300 ease-in-out',
                reserveSecondaryColumn && isSecondaryColumnOpen && 'lg:pr-96'
              )}
            >
              <div className="relative flex h-[calc(100dvh-4.5rem)] min-h-0 flex-col overflow-hidden rounded-2xl lg:h-[calc(100dvh-1rem)]">
                {hasWallpaper ? (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 z-0 overflow-hidden [transform:scale(1.08)]"
                  >
                    <OptimizedImage
                      src={panelWallpaperUrl!.trim()}
                      alt=""
                      fill
                      sizes={IMAGE_SIZES.wallpaper}
                      priority
                      className="object-cover"
                    />
                  </div>
                ) : null}
                  <div
                    className={clsx(
                      'relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain rounded-2xl',
                      innerContentPaddingClass,
                      panelGlassClass
                    )}
                  >
                    <div
                      className={clsx(
                        'mx-auto w-full',
                        contentPadding === 'none' && 'flex h-full min-h-0 flex-col',
                        contentWidthClass
                      )}
                    >
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
          aria-hidden={!isSecondaryColumnOpen}
          style={{ transitionDuration: `${SECONDARY_COLUMN_TRANSITION_MS}ms` }}
          className={clsx(
            'glass-surface fixed inset-y-0 right-0 z-40 hidden w-96 flex-col overflow-hidden border-l border-white/15 will-change-transform lg:flex dark:border-white/10',
            'transition-[transform,opacity] ease-in-out',
            isSecondaryColumnOpen
              ? 'translate-x-0 opacity-100'
              : 'pointer-events-none translate-x-full opacity-0'
          )}
        />
      ) : null}
    </>
  )
}
