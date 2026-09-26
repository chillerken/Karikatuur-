import { NextResponse } from 'next/server'
export function GET() { return NextResponse.json({ ok: true, app: 'luxwash-jarvis-vercel', version: '1.0.0' }) }
