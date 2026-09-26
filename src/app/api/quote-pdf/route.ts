import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function base() {
  return (process.env.SUPABASE_FUNCTIONS_BASE || 'https://nahwlhptgdkwhjcfkhkt.supabase.co/functions/v1').replace(/\/$/, '')
}

export async function GET(req: NextRequest) {
  const session = req.cookies.get('lwos_session')?.value
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id') || ''
  if (!/^[0-9a-fA-F-]{36}$/.test(id)) return NextResponse.json({ error: 'invalid_quote_id' }, { status: 400 })

  const upstream = await fetch(`${base()}/luxwash-quote-pdf?id=${encodeURIComponent(id)}`, {
    headers: { cookie: `lwos_session=${session}` },
    cache: 'no-store'
  })

  const bytes = await upstream.arrayBuffer()
  return new NextResponse(bytes, {
    status: upstream.status,
    headers: {
      'content-type': upstream.headers.get('content-type') || 'application/pdf',
      'content-disposition': upstream.headers.get('content-disposition') || 'inline',
      'cache-control': 'private, no-store'
    }
  })
}
