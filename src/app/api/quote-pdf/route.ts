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

export async function GET(req: NextRequest) {
  const session=req.cookies.get('jarvis_session')?.value
  if(!validSession(session)) return NextResponse.json({error:'unauthorized'},{status:401})
  const token=process.env.JARVIS_ENGINE_TOKEN||''
  if(!token)return NextResponse.json({error:'engine_token_missing'},{status:500})

  const id=req.nextUrl.searchParams.get('id')||''
  if(!/^[0-9a-fA-F-]{36}$/.test(id)) return NextResponse.json({error:'invalid_quote_id'},{status:400})

  const upstream=await fetch(`${base()}/luxwash-quote-pdf?id=${encodeURIComponent(id)}`,{
    headers:{'x-jarvis-token':token},
    cache:'no-store'
  })
  const bytes=await upstream.arrayBuffer()
  return new NextResponse(bytes,{
    status:upstream.status,
    headers:{
      'content-type':upstream.headers.get('content-type')||'application/pdf',
      'content-disposition':upstream.headers.get('content-disposition')||'inline',
      'cache-control':'private, no-store'
    }
  })
}
