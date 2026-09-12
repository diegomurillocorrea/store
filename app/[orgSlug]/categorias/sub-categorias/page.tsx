import { redirect } from 'next/navigation'

interface LegacySubCategoriasPageProps {
  params: Promise<{ orgSlug: string }>
}

export default async function LegacySubCategoriasPage({
  params,
}: LegacySubCategoriasPageProps) {
  const { orgSlug } = await params
  redirect(`/${orgSlug}/etiquetas`)
}
