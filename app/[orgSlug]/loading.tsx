export default function OrgLoading () {
  return (
    <div
      className="flex min-h-[50dvh] flex-col gap-4 p-6 lg:p-10"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="h-8 w-48 animate-pulse rounded-lg bg-zinc-950/10 dark:bg-white/10" />
      <div className="h-4 w-72 max-w-full animate-pulse rounded-md bg-zinc-950/8 dark:bg-white/8" />
      <div className="mt-4 h-64 w-full animate-pulse rounded-2xl bg-zinc-950/6 dark:bg-white/6" />
      <span className="sr-only">Cargando…</span>
    </div>
  )
}
