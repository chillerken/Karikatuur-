import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'node:crypto'

export const dynamic = 'force-dynamic'
const UUID = /^[0-9a-fA-F-]{36}$/

function validSession(cookie: string | undefined) {
  if (!cookie) return false
  const parts = cookie.split('.')
  if (parts.length !== 2) return false
  const [expiry, signature] = parts
  if (!/^\d{10,}$/.test(expiry) || Number(expiry) < Date.now() / 1000) return false
  const secret = process.env.JARVIS_SESSION_SECRET || ''
  if (!secret) return false
  const expected = createHmac('sha256', secret).update(expiry).digest('hex')
  try {
    const a = Buffer.from(expected, 'hex')
    const b = Buffer.from(signature, 'hex')
    return a.length === b.length && timingSafeEqual(a, b)
  } catch { return false }
}
function allowed(method: string, parts: string[]) {
  const path = parts.join('/')
  if (method === 'GET') {
    return new Set([
      'dashboard', 'integrations', 'leads', 'customers', 'appointments', 'quotes', 'fleet',
      'followups', 'communications', 'reviews', 'sales-drafts', 'social', 'automation-jobs'
    ]).has(path)
  }
  if (method === 'POST') {
    if (new Set(['leads/intake', 'quotes', 'appointments', 'fleet', 'social/draft']).has(path)) return true
    return parts.length === 3 && parts[0] === 'leads' && UUID.test(parts[1]) &&
      ['analyze', 'convert', 'draft'].includes(parts[2])
  }
  if (method === 'PATCH') {
    return (parts.length === 2 && parts[0] === 'leads' && UUID.test(parts[1])) ||
      (parts.length === 3 && parts[0] === 'sales-drafts' && UUID.test(parts[1]) && parts[2] === 'status')
  }
  return false
}
function fail(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: { 'cache-control': 'no-store' } })
}
async function proxy(req: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  if (!validSession(req.cookies.get('jarvis_session')?.value)) return fail('unauthorized', 401)
  const token = process.env.JARVIS_ENGINE_TOKEN || ''
  if (!token) return fail('engine_token_missing', 503)

  const { path = [] } = await context.params
  if (!allowed(req.method, path)) return fail('route_not_allowed', 404)
  if (req.method !== 'GET') {
    const origin = req.headers.get('origin')
    if (origin && origin !== req.nextUrl.origin) return fail('origin_not_allowed', 403)
    if (req.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') return fail('json_required', 415)
  }

  const base = (process.env.SUPABASE_FUNCTIONS_BASE ||
    'https://nahwlhptgdkwhjcfkhkt.supabase.co/functions/v1').replace(/\/$/, '')
  const url = new URL(base + '/luxwash-business-engine/api/' + path.map(encodeURIComponent).join('/'))
  req.nextUrl.searchParams.forEach((value, key) => url.searchParams.append(key, value))

  const headers: Record<string, string> = {
    'x-jarvis-token': token,
    'accept': 'application/json'
  }
  let body: string | undefined
  if (req.method !== 'GET') {
    body = await req.text()
    if (body.length > 32768) return fail('payload_too_large', 413)
    headers['content-type'] = 'application/json'
  }

  try {
    const upstream = await fetch(url, {
      method: req.method, headers, body, cache: 'no-store',
      signal: AbortSignal.timeout(20000)
    })
    return new NextResponse(await upstream.text(), {
      status: upstream.status,
      headers: {
        'content-type': upstream.headers.get('content-type') || 'application/json; charset=utf-8',
        'cache-control': 'no-store'
      }
    })
  } catch (err) {
    console.error('JARVIS engine proxy unavailable', err instanceof Error ? err.name : 'unknown')
    return fail('engine_temporarily_unavailable', 503)
  }
}
export const GET = proxy
export const POST = proxy
export const PATCH = proxy
