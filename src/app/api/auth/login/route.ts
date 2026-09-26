import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function base() {
  return (process.env.SUPABASE_FUNCTIONS_BASE || 'https://nahwlhptgdkwhjcfkhkt.supabase.co/functions/v1').replace(/\/$/, '')
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const password = String(body?.password || '')
  if (!password) return NextResponse.json({ error: 'password_required' }, { status: 400 })

  const form = new FormData()
  form.set('password', password)

  const upstream = await fetch(`${base()}/luxwash-ai-os/`, {
    method: 'POST',
    body: form,
    redirect: 'manual',
    cache: 'no-store'
  })

  const setCookie = upstream.headers.get('set-cookie') || ''
  const match = setCookie.match(/(?:^|;\s*)lwos_session=([^;]+)/) || setCookie.match(/lwos_session=([^;]+)/)
  if (!match) {
    return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set('lwos_session', match[1], {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24 * 7
  })
  return res
}
