import { type NextRequest, NextResponse } from 'next/server'

const MAX_BYTES = 2_500_000

function isAllowedLogoHost(hostname: string): boolean {
  const h = hostname.toLowerCase()
  const patterns = [
    'fbcdn.net',
    'instagram.com',
    'cdninstagram.com',
    'facebook.com',
  ]
  return patterns.some((p) => h === p || h.endsWith(`.${p}`))
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('url')
  if (!raw?.trim()) {
    return NextResponse.json({ error: 'Falta url' }, { status: 400 })
  }

  let target: URL
  try {
    target = new URL(raw)
  } catch {
    return NextResponse.json({ error: 'URL inválida' }, { status: 400 })
  }

  if (target.protocol !== 'https:' && target.protocol !== 'http:') {
    return NextResponse.json({ error: 'Solo http(s)' }, { status: 400 })
  }

  if (!isAllowedLogoHost(target.hostname)) {
    return NextResponse.json({ error: 'Host no permitido' }, { status: 403 })
  }

  const upstream = await fetch(target.toString(), {
    headers: {
      Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(12_000),
    cache: 'no-store',
  })

  if (!upstream.ok) {
    return NextResponse.json({ error: 'No se pudo obtener la imagen' }, { status: 502 })
  }

  const type = upstream.headers.get('content-type') ?? 'image/jpeg'
  if (!type.startsWith('image/')) {
    return NextResponse.json({ error: 'No es una imagen' }, { status: 422 })
  }

  const buf = await upstream.arrayBuffer()
  if (buf.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: 'Imagen demasiado grande' }, { status: 413 })
  }

  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': type,
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
