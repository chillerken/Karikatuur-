import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function base() {
  return (process.env.SUPABASE_FUNCTIONS_BASE || 'https://nahwlhptgdkwhjcfkhkt.supabase.co/functions/v1').replace(/\/$/, '')
}

async function probe(path:string) {
  const started=Date.now()
  try {
    const r=await fetch(base()+path,{cache:'no-store',signal:AbortSignal.timeout(8000)})
    return { ok:r.ok, status:r.status, latency_ms:Date.now()-started }
  } catch {
    return { ok:false, status:0, latency_ms:Date.now()-started }
  }
}

export async function GET() {
  const [engine,pdf]=await Promise.all([
    probe('/luxwash-business-engine/health'),
    probe('/luxwash-quote-pdf/health')
  ])
  const ok=engine.ok && pdf.ok
  return NextResponse.json({
    ok,
    app:'luxwash-jarvis',
    version:'1.1.0',
    frontend:'ok',
    business_engine:engine,
    quote_pdf:pdf,
    checked_at:new Date().toISOString()
  },{status:ok?200:503,headers:{'cache-control':'no-store'}})
}
