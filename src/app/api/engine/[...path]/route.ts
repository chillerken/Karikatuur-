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

function allowed(method:string,parts:string[]){
  const p=parts.join('/')
  const id='[0-9a-fA-F-]{36}'
  if(method==='GET')return new Set(['dashboard','integrations','leads','customers','appointments','quotes','fleet','followups','communications','reviews','sales-drafts','social','automation-jobs']).has(p)
  if(method==='POST')return new Set(['leads/intake','quotes','appointments','fleet','social/draft']).has(p)
    || new RegExp('^leads/'+id+'/(analyze|convert|draft)
  const session = req.cookies.get('jarvis_session')?.value
  if (!validSession(session)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const token=process.env.JARVIS_ENGINE_TOKEN||''
  if(!token)return NextResponse.json({error:'engine_token_missing'},{status:500})

  const { path = [] } = await context.params
  const parts = path
  if(!allowed(req.method,parts))return NextResponse.json({error:'route_not_allowed'},{status:404})
  if(!['GET','HEAD'].includes(req.method)&&!sameOrigin(req))return NextResponse.json({error:'origin_not_allowed'},{status:403})
  if(!['GET','HEAD'].includes(req.method)&&req.headers.get('content-type')?.split(';')[0].trim()!=='application/json')return NextResponse.json({error:'json_required'},{status:415})
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
    if(body.length>32768)return NextResponse.json({error:'payload_too_large'},{status:413})
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
).test(p)
  if(method==='PATCH')return new RegExp('^leads/'+id+'
  const session = req.cookies.get('jarvis_session')?.value
  if (!validSession(session)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const token=process.env.JARVIS_ENGINE_TOKEN||''
  if(!token)return NextResponse.json({error:'engine_token_missing'},{status:500})

  const { path = [] } = await context.params
  const parts = path
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
).test(p)
    || new RegExp('^sales-drafts/'+id+'/status
  const session = req.cookies.get('jarvis_session')?.value
  if (!validSession(session)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const token=process.env.JARVIS_ENGINE_TOKEN||''
  if(!token)return NextResponse.json({error:'engine_token_missing'},{status:500})

  const { path = [] } = await context.params
  const parts = path
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
).test(p)
  return false
}
function sameOrigin(req:NextRequest){
  const origin=req.headers.get('origin')
  return !origin || origin===req.nextUrl.origin
}

async function proxy(req: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  const session = req.cookies.get('jarvis_session')?.value
  if (!validSession(session)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const token=process.env.JARVIS_ENGINE_TOKEN||''
  if(!token)return NextResponse.json({error:'engine_token_missing'},{status:500})

  const { path = [] } = await context.params
  const parts = path
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
