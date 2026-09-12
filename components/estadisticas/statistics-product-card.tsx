import Link from 'next/link'
import { OptimizedImage } from '@/components/optimized-image'
import type { StatisticsProductHighlight } from '@/lib/data/statistics-types'
import { Text } from '@/styles/catalyst-ui-kit/text'

const surfaceClass =
  'border border-zinc-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900'

function ProductThumb({
  name,
  imageUrl,
}: {
  name: string
  imageUrl: string | null
}) {
  if (imageUrl) {
    return (
      <OptimizedImage
        src={imageUrl}
        alt=""
        width={56}
        height={56}
        sizes="56px"
        className="size-14 rounded-xl border border-zinc-200 object-cover dark:border-zinc-700"
      />
    )
  }

  return (
    <div
      aria-hidden="true"
      className="flex size-14 items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50 text-sm text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500"
    >
      {name.slice(0, 1).toUpperCase()}
    </div>
  )
}

export function StatisticsProductCard({
  orgSlug,
  title,
  emptyLabel,
  product,
  value,
  tone,
  icon: Icon,
  subtitle,
}: {
  orgSlug: string
  title: string
  emptyLabel: string
  product: StatisticsProductHighlight | null
  value: string
  tone: 'neutral' | 'positive' | 'negative'
  icon: React.ComponentType<{ className?: string }>
  subtitle?: string
}) {
  const valueClass =
    tone === 'positive'
      ? 'text-emerald-600 dark:text-emerald-400'
      : tone === 'negative'
        ? 'text-red-600 dark:text-red-400'
        : 'text-zinc-900 dark:text-zinc-100'

  const iconClass =
    tone === 'positive'
      ? 'text-emerald-600 dark:text-emerald-400'
      : tone === 'negative'
        ? 'text-red-600 dark:text-red-400'
        : 'text-zinc-500 dark:text-zinc-400'

  if (!product) {
    return (
      <div className={`rounded-2xl p-5 ${surfaceClass}`}>
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800">
            <Icon className={`size-5 ${iconClass}`} aria-hidden="true" />
          </div>
          <Text className="text-sm text-zinc-500 dark:text-zinc-400">{title}</Text>
        </div>
        <Text className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
          {emptyLabel}
        </Text>
      </div>
    )
  }

  return (
    <Link
      href={`/${orgSlug}/productos/${product.productId}`}
      aria-label={`Ver ${product.name}`}
      className={`block rounded-2xl p-5 transition hover:border-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 dark:hover:border-zinc-600 ${surfaceClass}`}
    >
      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800">
          <Icon className={`size-5 ${iconClass}`} aria-hidden="true" />
        </div>
        <Text className="text-sm text-zinc-500 dark:text-zinc-400">{title}</Text>
      </div>

      <div className="mt-4 flex items-start gap-3">
        <ProductThumb name={product.name} imageUrl={product.imageUrl} />
        <div className="min-w-0">
          <p className="line-clamp-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {product.name}
          </p>
          <p className={`mt-1 text-2xl font-semibold tracking-tight ${valueClass}`}>
            {value}
          </p>
          {subtitle ? (
            <Text className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {subtitle}
            </Text>
          ) : null}
        </div>
      </div>
    </Link>
  )
}
