import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function base() {
  return (process.env.SUPABASE_FUNCTIONS_BASE || 'https://nahwlhptgdkwhjcfkhkt.supabase.co/functions/v1').replace(/\/$/, '')
}

async function proxy(req: NextRequest, context: { params: { path?: string[] } }) {
  const session = req.cookies.get('lwos_session')?.value
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const parts = context.params.path || []
  const suffix = parts.map(encodeURIComponent).join('/')
  const url = new URL(`${base()}/luxwash-business-engine/api/${suffix}`)
  req.nextUrl.searchParams.forEach((value, key) => url.searchParams.append(key, value))

  const headers: Record<string, string> = {
    cookie: `lwos_session=${session}`,
    accept: 'application/json'
  }

  let body: string | undefined
  if (!['GET', 'HEAD'].includes(req.method)) {
    body = await req.text()
    headers['content-type'] = req.headers.get('content-type') || 'application/json'
  }

  const upstream = await fetch(url, {
    method: req.method,
    headers,
    body,
    cache: 'no-store'
  })

  const text = await upstream.text()
  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      'content-type': upstream.headers.get('content-type') || 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  })
}

export const GET = proxy
export const POST = proxy
export const PATCH = proxy
export const PUT = proxy
export const DELETE = proxy
