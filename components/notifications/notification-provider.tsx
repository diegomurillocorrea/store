'use client'

import { Transition } from '@headlessui/react'
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type NotificationVariant = 'success' | 'error'

export interface NotificationInput {
  title: string
  description?: string
  variant?: NotificationVariant
  durationMs?: number
}

interface NotificationItem extends NotificationInput {
  id: string
}

interface NotificationContextValue {
  notify: (input: NotificationInput) => void
  dismiss: (id: string) => void
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

const DEFAULT_DURATION_MS = 5000

function NotificationIcon({ variant }: { variant: NotificationVariant }) {
  if (variant === 'error') {
    return (
      <ExclamationCircleIcon
        aria-hidden="true"
        className="size-6 text-red-400"
      />
    )
  }

  return (
    <CheckCircleIcon
      aria-hidden="true"
      className="size-6 text-emerald-400"
    />
  )
}

function NotificationToast({
  notification,
  onDismiss,
}: {
  notification: NotificationItem
  onDismiss: (id: string) => void
}) {
  const variant = notification.variant ?? 'success'

  return (
    <Transition show>
      <div className="pointer-events-auto w-full max-w-sm rounded-lg bg-white shadow-lg outline-1 outline-black/5 transition data-closed:opacity-0 data-enter:transform data-enter:duration-300 data-enter:ease-out data-closed:data-enter:translate-y-2 data-leave:duration-100 data-leave:ease-in data-closed:data-enter:sm:translate-x-2 data-closed:data-enter:sm:translate-y-0 dark:bg-zinc-900 dark:outline-white/10">
        <div className="p-4">
          <div className="flex items-start">
            <div className="shrink-0">
              <NotificationIcon variant={variant} />
            </div>
            <div className="ml-3 w-0 flex-1 pt-0.5">
              <p className="text-sm font-medium text-gray-900 dark:text-zinc-100">
                {notification.title}
              </p>
              {notification.description ? (
                <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
                  {notification.description}
                </p>
              ) : null}
            </div>
            <div className="ml-4 flex shrink-0">
              <button
                type="button"
                onClick={() => onDismiss(notification.id)}
                className="inline-flex rounded-md text-gray-400 hover:text-gray-500 focus:outline-2 focus:outline-offset-2 focus:outline-emerald-600 dark:hover:text-zinc-300"
              >
                <span className="sr-only">Cerrar</span>
                <XMarkIcon aria-hidden="true" className="size-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  )
}

function NotificationContainer({
  notifications,
  onDismiss,
}: {
  notifications: NotificationItem[]
  onDismiss: (id: string) => void
}) {
  if (notifications.length === 0) return null

  return (
    <div
      aria-live="assertive"
      className="pointer-events-none fixed inset-0 z-50 flex items-end px-4 py-6 sm:items-start sm:p-6"
    >
      <div className="flex w-full flex-col items-center space-y-4 sm:items-end">
        {notifications.map((notification) => (
          <NotificationToast
            key={notification.id}
            notification={notification}
            onDismiss={onDismiss}
          />
        ))}
      </div>
    </div>
  )
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])

  const dismiss = useCallback((id: string) => {
    setNotifications((current) => current.filter((item) => item.id !== id))
  }, [])

  const notify = useCallback(
    (input: NotificationInput) => {
      const id = crypto.randomUUID()
      const durationMs = input.durationMs ?? DEFAULT_DURATION_MS

      setNotifications((current) => [...current, { ...input, id }])

      window.setTimeout(() => {
        dismiss(id)
      }, durationMs)
    },
    [dismiss]
  )

  const value = useMemo(
    () => ({
      notify,
      dismiss,
    }),
    [notify, dismiss]
  )

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationContainer notifications={notifications} onDismiss={dismiss} />
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)

  if (!context) {
    throw new Error('useNotifications debe usarse dentro de NotificationProvider')
  }

  return context
}
