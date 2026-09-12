import { StatisticsPanel } from '@/components/estadisticas/statistics-panel'
import { requireViewAccess } from '@/lib/auth/access'
import { getSalesStatistics } from '@/lib/data/statistics'
import {
  DEFAULT_TIME_ZONE,
  getTodayDateString,
  isValidBalancePeriod,
  isValidDateString,
  resolveBalanceDateRange,
} from '@/lib/utils/local-date'

interface EstadisticasPageProps {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{
    fecha?: string
    fechaHasta?: string
    periodo?: string
  }>
}

export default async function EstadisticasPage({ params, searchParams }: EstadisticasPageProps) {
  const { orgSlug } = await params
  const { fecha, fechaHasta, periodo } = await searchParams
  const access = await requireViewAccess(orgSlug, 'estadisticas')
  const organizationId = access.organization.id
  const timeZone = DEFAULT_TIME_ZONE
  const hasExplicitDate = isValidDateString(fecha)
  const selectedDate = hasExplicitDate ? fecha : getTodayDateString(timeZone)
  const selectedPeriod = isValidBalancePeriod(periodo) ? periodo : 'diario'
  const selectedEndDate = isValidDateString(fechaHasta) ? fechaHasta : selectedDate
  const { startDate, endDate } = resolveBalanceDateRange(
    selectedPeriod,
    selectedDate,
    selectedEndDate
  )

  const statistics = await getSalesStatistics(organizationId, startDate, endDate, timeZone)

  return (
    <div className="px-4 pb-10 sm:px-6 lg:px-8">
      <StatisticsPanel
        orgSlug={orgSlug}
        selectedDate={selectedDate}
        selectedEndDate={selectedEndDate}
        startDate={startDate}
        endDate={endDate}
        selectedPeriod={selectedPeriod}
        hasExplicitDate={hasExplicitDate}
        timeZone={timeZone}
        statistics={statistics}
      />
    </div>
  )
}
