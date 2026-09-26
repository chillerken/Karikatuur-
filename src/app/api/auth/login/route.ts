import { NextRequest, NextResponse } from 'next/server'
import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

export const dynamic = 'force-dynamic'

function safeEqualHex(a:string,b:string){
  try{
    const A=Buffer.from(a,'hex'),B=Buffer.from(b,'hex')
    return A.length===B.length && timingSafeEqual(A,B)
  }catch{return false}
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const password = String(body?.password || '')
  if (!password) return NextResponse.json({ error: 'password_required' }, { status: 400 })

  const expected = process.env.JARVIS_LOGIN_HASH || ''
  const secret = process.env.JARVIS_SESSION_SECRET || ''
  if (!expected || !secret) return NextResponse.json({ error: 'auth_not_configured' }, { status: 500 })

  const actual = createHash('sha256').update(password).digest('hex')
  if (!safeEqualHex(actual, expected)) return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 })

  const exp = Math.floor(Date.now()/1000) + 60*60*24*7
  const sig = createHmac('sha256', secret).update(String(exp)).digest('hex')
  const res = NextResponse.json({ ok: true })
  res.cookies.set('jarvis_session', exp+'.'+sig, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    maxAge: 60*60*24*7
  })
  return res
}
