import { redirect } from 'next/navigation'

interface OrgIndexPageProps {
  params: Promise<{ orgSlug: string }>
}

export default async function OrgIndexPage({ params }: OrgIndexPageProps) {
  const { orgSlug } = await params
  redirect(`/${orgSlug}/dashboard`)
}
