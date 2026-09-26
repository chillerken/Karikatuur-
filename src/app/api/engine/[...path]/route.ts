import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'node:crypto'

export const dynamic = 'force-dynamic'

function base() {
  return (process.env.SUPABASE_FUNCTIONS_BASE || 'https://nahwlhptgdkwhjcfkhkt.supabase.co/functions/v1').replace(/\/$/, '')
}
function validSession(v:string|undefined){
  if(!v)return false
  const [e,s]=v.split('.')
  if(!e||!s||Number(e)<Date.now()/1000)return false
  const secret=process.env.JARVIS_SESSION_SECRET||''
  if(!secret)return false
  const x=createHmac('sha256',secret).update(e).digest('hex')
  try{
    const A=Buffer.from(x,'hex'),B=Buffer.from(s,'hex')
    return A.length===B.length && timingSafeEqual(A,B)
  }catch{return false}
}

async function proxy(req: NextRequest, context: { params: { path?: string[] } }) {
  const session = req.cookies.get('jarvis_session')?.value
  if (!validSession(session)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const token=process.env.JARVIS_ENGINE_TOKEN||''
  if(!token)return NextResponse.json({error:'engine_token_missing'},{status:500})

  const parts = context.params.path || []
  const suffix = parts.map(encodeURIComponent).join('/')
  const url = new URL(`${base()}/luxwash-business-engine/api/${suffix}`)
  req.nextUrl.searchParams.forEach((value, key) => url.searchParams.append(key, value))

  const headers: Record<string, string> = {
    'x-jarvis-token': token,
    accept: 'application/json'
  }
  let body: string | undefined
  if (!['GET', 'HEAD'].includes(req.method)) {
    body = await req.text()
    headers['content-type'] = req.headers.get('content-type') || 'application/json'
  }

  const upstream = await fetch(url, { method:req.method, headers, body, cache:'no-store' })
  const text = await upstream.text()
  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      'content-type': upstream.headers.get('content-type') || 'application/json; charset=utf-8',
      'cache-control':'no-store'
    }
  })
}
export const GET=proxy
export const POST=proxy
export const PATCH=proxy
export const PUT=proxy
export const DELETE=proxy
