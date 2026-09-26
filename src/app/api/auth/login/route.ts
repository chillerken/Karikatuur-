import { NextRequest, NextResponse } from 'next/server'
import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

export const dynamic = 'force-dynamic'

// Per-instance throttle; deployment edge/WAF limits remain a separate control.
const tries = new Map<string,{count:number;until:number}>()
const WINDOW_MS=15*60*1000
const MAX_ATTEMPTS=5

function safeEqualHex(a:string,b:string){
  try{
    const A=Buffer.from(a,'hex'),B=Buffer.from(b,'hex')
    return A.length===B.length && timingSafeEqual(A,B)
  }catch{return false}
}

export async function POST(req: NextRequest) {
  const origin=req.headers.get('origin')
  if(origin && origin!==req.nextUrl.origin) return NextResponse.json({error:'origin_not_allowed'},{status:403})
  const ip=(req.headers.get('x-forwarded-for')||'unknown').split(',')[0].trim()
  const now=Date.now()
  if(tries.size>1000)for(const [k,v] of tries)if(v.until<now)tries.delete(k)
  const limit=tries.get(ip)
  if(limit && limit.until>now && limit.count>=MAX_ATTEMPTS)
    return NextResponse.json({error:'too_many_attempts'},{status:429,headers:{'retry-after':String(Math.ceil((limit.until-now)/1000))}})
  const body = await req.json().catch(() => ({}))
  const password = String(body?.password || '')
  if (password.length>128) return NextResponse.json({error:'invalid_credentials'},{status:401})
  if (!password) return NextResponse.json({ error: 'password_required' }, { status: 400 })

  const expected = process.env.JARVIS_LOGIN_HASH || ''
  const secret = process.env.JARVIS_SESSION_SECRET || ''
  if (!expected || !secret) return NextResponse.json({ error: 'auth_not_configured' }, { status: 500 })

  const actual = createHash('sha256').update(password).digest('hex')
  if (!safeEqualHex(actual, expected)) {
    const n=limit && limit.until>now ? limit.count+1 : 1
    tries.set(ip,{count:n,until:limit && limit.until>now ? limit.until : now+WINDOW_MS})
    return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 })
  }
  tries.delete(ip)

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
