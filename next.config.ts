import type { NextConfig } from 'next'

function getSupabaseImagePattern() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  if (!url) return null

  try {
    const { protocol, hostname } = new URL(url)
    if (protocol !== 'https:' && protocol !== 'http:') return null

    return {
      protocol: protocol.replace(':', '') as 'http' | 'https',
      hostname,
      pathname: '/storage/v1/object/public/**',
    }
  } catch {
    return null
  }
}

const supabasePattern = getSupabaseImagePattern()

const nextConfig: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    localPatterns: [
      {
        pathname: '/api/brand-logo',
        // Omit search so proxied logo URLs (?url=...) are allowed.
      },
    ],
    remotePatterns: supabasePattern ? [supabasePattern] : [],
  },
}

export default nextConfig
