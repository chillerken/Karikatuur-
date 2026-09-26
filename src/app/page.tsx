'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

type Row = Record<string, any>

const tabs = ['dashboard','leads','customers','quotes','appointments','fleet','communications','reviews','integrations'] as const
type Tab = (typeof tabs)[number]
const tabLabel: Record<Tab,string> = {
  dashboard:'Overzicht', leads:'Leads & CRM', customers:'Klanten', quotes:'Offertes',
  appointments:'Afspraken', fleet:'Fleet Care', communications:'Communicatie',
  reviews:'Reviews', integrations:'Integraties'
}
const stages = ['new','analyzed','contact_planned','email_sent','replied','interested','quote_created','appointment_planned','customer','fleet_care','not_interested']
const stageLabel: Record<string,string> = {new:'Nieuw',analyzed:'Geanalyseerd',contact_planned:'Contact gepland',email_sent:'E-mail verstuurd',replied:'Reactie',interested:'Interessant',quote_created:'Offerte',appointment_planned:'Afspraak',customer:'Klant',fleet_care:'Fleet Care',not_interested:'Niet interessant'}
const nf = new Intl.NumberFormat('nl-BE')
const eur = (c:any) => new Intl.NumberFormat('nl-BE',{style:'currency',currency:'EUR'}).format((Number(c)||0)/100)
const dt = (v:any) => v ? new Date(v).toLocaleString('nl-BE',{dateStyle:'short',timeStyle:'short'}) : '—'
const stageOf = (x:Row) => x.pipeline_stage || (x.status==='won'?'customer':x.status==='lost'?'not_interested':x.status==='new'?'new':'legacy')

async function api(path:string, init:RequestInit={}) {
  const r = await fetch('/api/engine'+path,{...init,cache:'no-store',headers:{'content-type':'application/json',...(init.headers||{})}})
  const text = await r.text()
  let data:any = text
  try { data = text ? JSON.parse(text) : null } catch {}
  if (!r.ok) { const e:any = new Error(data?.error || 'HTTP '+r.status); e.status=r.status; throw e }
  return data
}
function Card({children}:{children:React.ReactNode}) { return <div className="card">{children}</div> }
function Empty({children}:{children:React.ReactNode}) { return <div className="empty">{children}</div> }
function Kpi({value,label,tone=''}:{value:string,label:string,tone?:string}) { return <div className="kpi"><div className={'num '+tone}>{value}</div><div className="lab">{label}</div></div> }

export default function Home() {
  const [auth,setAuth] = useState<boolean|null>(null)
  const [password,setPassword] = useState('')
  const [tab,setTab] = useState<Tab>('dashboard')
  const [busy,setBusy] = useState(false)
  const [notice,setNotice] = useState('')
  const [data,setData] = useState<any>({dash:null,leads:[],customers:[],quotes:[],appointments:[],fleet:[],communications:[],reviews:[],integrations:[]})
  const [search,setSearch] = useState('')
  const [filter,setFilter] = useState('')
  const [command,setCommand] = useState('')
  const [answer,setAnswer] = useState('Alle cijfers hieronder komen uit de live productie-backend.')
  const [quote,setQuote] = useState({lead_id:'',customer_id:'',description:'',quantity:'1',unit:'',notes:''})
  const [appointment,setAppointment] = useState({lead_id:'',customer_id:'',starts_at:'',service:'',address:'',postcode:'',vehicle:'',price:''})
  const [fleet,setFleet] = useState({customer_id:'',package:'monthly',monthly:'',next_visit:''})

  const load = useCallback(async()=>{
    try {
      const dash=await api('/dashboard')
      const [leads,customers,quotes,appointments,fleetData,communications,reviews,integrations]=await Promise.all([
        api('/leads?limit=200'),api('/customers?limit=200'),api('/quotes?limit=100'),api('/appointments?limit=100'),
        api('/fleet?limit=100'),api('/communications?limit=80'),api('/reviews?limit=100'),api('/integrations')
      ])
      setData({dash,leads,customers,quotes,appointments,fleet:fleetData,communications,reviews,integrations})
      setAuth(true)
    } catch(e:any) {
      if(e.status===401) setAuth(false)
      else setNotice('Live data kon niet laden: '+e.message)
    }
  },[])

  useEffect(()=>{load()},[load])
  useEffect(()=>{if(!auth)return;const i=setInterval(()=>api('/dashboard').then(d=>setData((s:any)=>({...s,dash:d}))).catch(()=>{}),60000);return()=>clearInterval(i)},[auth])

  async function login(){
    if(!password)return
    setBusy(true);setNotice('')
    try{
      const r=await fetch('/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({password})})
      if(!r.ok)throw new Error('Ongeldige toegangscode')
      setPassword('');setAuth(true);await load()
    }catch(e:any){setNotice(e.message)}finally{setBusy(false)}
  }
  async function logout(){await fetch('/api/auth/logout',{method:'POST'});setAuth(false)}
  async function run(fn:()=>Promise<any>,ok=''){
    setBusy(true);setNotice('')
    try{await fn();if(ok)setNotice(ok);await load()}catch(e:any){setNotice(e.message||'Actie mislukt')}finally{setBusy(false)}
  }

  const leads=useMemo(()=>data.leads.filter((x:Row)=>{
    const q=search.toLowerCase(), h=[x.company,x.name,x.email,x.phone,x.city,x.sector].join(' ').toLowerCase()
    return (!q||h.includes(q))&&(!filter||stageOf(x)===filter)
  }),[data.leads,search,filter])
  const customerName=(id:string)=>{const c=data.customers.find((x:Row)=>x.id===id);return c?(c.company||c.name||id):id}
  const d=data.dash||{}

  function askJarvis(){
    const q=command.toLowerCase();let t='Ik kan live status, leads, klanten, offertes, afspraken, Fleet Care en integraties beantwoorden.'
    if(q.includes('lead'))t=`${nf.format(d.leads?.total||0)} productie-leads; ${nf.format(d.leads?.active||0)} actief.`
    else if(q.includes('klant'))t=`${nf.format(d.customers?.total||0)} productieklanten.`
    else if(q.includes('offerte'))t=`${nf.format(d.quotes?.open||0)} open offertes voor ${eur(d.quotes?.open_value_cents)}.`
    else if(q.includes('fleet'))t=`${nf.format(d.fleet_care?.active||0)} Fleet Care klanten, ${eur(d.fleet_care?.mrr_cents)} MRR.`
    else if(q.includes('status')||q.includes('fout'))t=`${nf.format(d.automations?.pending||0)} automations in wachtrij, ${nf.format(d.automations?.errors||0)} fouten.`
    setAnswer(t);try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);u.lang='nl-BE';speechSynthesis.speak(u)}catch{}
  }

  if(auth===null)return <div className="loginShell"><div className="spinner"/></div>
  if(!auth)return <div className="loginShell"><div className="panel login"><div className="heading"><h2>LuxWash JARVIS</h2></div><div className="meta">Beveiligde productieomgeving</div><div className="space"/><div className="row"><input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&login()} placeholder="Toegangscode"/><button className="btn primary" onClick={login} disabled={busy}>Login</button></div>{notice&&<><div className="space"/><div className="notice">{notice}</div></>}</div></div>

  return <main className="wrap">
    <header className="top"><div><div className="brand"><b>LUXWASH</b> · JARVIS BUSINESS ENGINE</div><div className="meta">LIVE · {d.generated_at?dt(d.generated_at):'laden…'}</div></div><div className="actions"><button className="btn" onClick={load}>↻</button><button className="btn" onClick={logout}>Uitloggen</button></div></header>
    <nav className="nav">{tabs.map(t=><button key={t} className={'tab '+(tab===t?'active':'')} onClick={()=>setTab(t)}>{tabLabel[t]}</button>)}</nav>
    {notice&&<div className="notice">{notice}</div>}

    {tab==='dashboard'&&<>
      <div className="panel"><div className="voice"><div className="orb">◉</div><div><div className="title">Vlaamse JARVIS</div><div className="meta">CRM · offertes · afspraken · Fleet Care · integraties</div><div className="tools"><input className="input" value={command} onChange={e=>setCommand(e.target.value)} onKeyDown={e=>e.key==='Enter'&&askJarvis()} placeholder="Vraag status, leads, offertes…"/><button className="btn cyan" onClick={askJarvis}>Vraag</button></div><div className="answer">{answer}</div></div></div></div>
      <div className="space"/><div className="panel"><div className="heading"><h2>Kerncijfers</h2></div><div className="kpis">
        <Kpi value={nf.format(d.leads?.total||0)} label="Leads"/><Kpi value={nf.format(d.leads?.active||0)} label="Actieve pipeline" tone="gold"/>
        <Kpi value={nf.format(d.customers?.total||0)} label="Klanten" tone="green"/><Kpi value={nf.format(d.appointments?.today||0)} label="Afspraken vandaag"/>
        <Kpi value={nf.format(d.quotes?.open||0)} label="Open offertes"/><Kpi value={eur(d.quotes?.open_value_cents)} label="Offertewaarde"/>
        <Kpi value={nf.format(d.fleet_care?.active||0)} label="Fleet Care" tone="gold"/><Kpi value={eur(d.fleet_care?.mrr_cents)} label="Fleet MRR" tone="gold"/>
        <Kpi value={eur(d.revenue?.month_cents)} label="Omzet maand" tone="green"/><Kpi value={nf.format(d.followups?.open||0)} label="Follow-ups"/>
        <Kpi value={nf.format(d.automations?.pending||0)} label="Automation wachtrij" tone="amber"/><Kpi value={nf.format(d.notifications?.unread||0)} label="Meldingen" tone="amber"/>
      </div></div>
      <div className="space"/><div className="grid2">
        <div className="panel"><div className="heading"><h2>CRM pipeline</h2></div><div className="list">{Object.entries(d.pipeline||{}).length?Object.entries(d.pipeline||{}).map(([k,v]:any)=><Card key={k}><div className="cardTop"><div className="title">{stageLabel[k]||k}</div><div className="num" style={{fontSize:16}}>{nf.format(v)}</div></div></Card>):<Empty>Nog geen productie-pipeline.</Empty>}</div></div>
        <div className="panel"><div className="heading"><h2>Systeemstatus</h2></div><div className="list"><Card><div className="cardTop"><div className="title">Automations in wachtrij</div><div>{nf.format(d.automations?.pending||0)}</div></div></Card><Card><div className="cardTop"><div className="title">Automatiefouten</div><div className="red">{nf.format(d.automations?.errors||0)}</div></div></Card><Card><div className="cardTop"><div className="title">Ongelezen meldingen</div><div className="amber">{nf.format(d.notifications?.unread||0)}</div></div></Card></div></div>
      </div>
    </>}

    {tab==='leads'&&<div className="panel"><div className="heading"><h2>Leads & CRM</h2></div><div className="tools"><input className="input" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Zoek bedrijf, e-mail, gemeente…"/><select className="select" value={filter} onChange={e=>setFilter(e.target.value)}><option value="">Alle stages</option>{stages.map(s=><option key={s} value={s}>{stageLabel[s]}</option>)}</select></div><div className="list">{leads.length?leads.map((x:Row)=><Card key={x.id}><div className="cardTop"><div><div className="title">{x.company||x.name||'Lead'}</div><div className="meta">{[x.name,x.email,x.phone,x.city].filter(Boolean).join(' · ')}</div></div><span className="badge">{stageLabel[stageOf(x)]||stageOf(x)}</span></div><div className="details"><div className="detail"><b>Sector</b><span>{x.sector||'—'}</span></div><div className="detail"><b>Score</b><span>{x.commercial_score==null?'—':x.commercial_score+'/100'}</span></div><div className="detail"><b>Voertuigen</b><span>{x.estimated_vehicles??'—'}</span></div><div className="detail"><b>Actie</b><span>{x.next_action||'—'}</span></div></div><div className="tools"><button className="btn small" onClick={()=>run(()=>api(`/leads/${x.id}/analyze`,{method:'POST',body:'{}'}),'Lead geanalyseerd.')}>AI analyse</button><button className="btn small" onClick={()=>run(()=>api(`/leads/${x.id}/convert`,{method:'POST',body:'{}'}),'Lead klant geworden.')}>→ Klant</button><select className="select" value={stageOf(x)} onChange={e=>run(()=>api(`/leads/${x.id}`,{method:'PATCH',body:JSON.stringify({pipeline_stage:e.target.value})}))}>{stages.map(s=><option key={s} value={s}>{stageLabel[s]}</option>)}</select></div></Card>):<Empty>Geen productie-leads gevonden.</Empty>}</div></div>}

    {tab==='customers'&&<div className="panel"><div className="heading"><h2>Klanten</h2></div><div className="list">{data.customers.length?data.customers.map((c:Row)=><Card key={c.id}><div className="cardTop"><div><div className="title">{c.company||c.name||'Klant'}</div><div className="meta">{[c.name,c.email,c.phone,c.city].filter(Boolean).join(' · ')}</div></div><span className="badge">{c.customer_type||c.status||'klant'}</span></div></Card>):<Empty>Nog geen productieklanten.</Empty>}</div></div>}

    {tab==='quotes'&&<><div className="panel"><div className="heading"><h2>Nieuwe offerte</h2></div><div className="formGrid"><div className="formItem wide"><label className="label">Lead</label><select className="select" value={quote.lead_id} onChange={e=>setQuote({...quote,lead_id:e.target.value})}><option value="">— geen —</option>{data.leads.map((x:Row)=><option key={x.id} value={x.id}>{x.company||x.name||x.email}</option>)}</select></div><div className="formItem wide"><label className="label">Klant</label><select className="select" value={quote.customer_id} onChange={e=>setQuote({...quote,customer_id:e.target.value})}><option value="">— geen —</option>{data.customers.map((x:Row)=><option key={x.id} value={x.id}>{x.company||x.name||x.email}</option>)}</select></div><div className="formItem wide"><label className="label">Omschrijving</label><input className="input" value={quote.description} onChange={e=>setQuote({...quote,description:e.target.value})}/></div><div className="formItem"><label className="label">Aantal</label><input className="input" type="number" value={quote.quantity} onChange={e=>setQuote({...quote,quantity:e.target.value})}/></div><div className="formItem"><label className="label">Prijs/stuk (€)</label><input className="input" type="number" step="0.01" value={quote.unit} onChange={e=>setQuote({...quote,unit:e.target.value})}/></div><div className="formItem full"><label className="label">Notitie</label><input className="input" value={quote.notes} onChange={e=>setQuote({...quote,notes:e.target.value})}/></div><div className="formItem"><button className="btn primary" onClick={()=>run(()=>api('/quotes',{method:'POST',body:JSON.stringify({lead_id:quote.lead_id||null,customer_id:quote.customer_id||null,title:'LuxWash offerte',notes:quote.notes,validity_days:30,items:[{description:quote.description,quantity:Number(quote.quantity||1),unit_cents:Math.round(Number(quote.unit||0)*100)}]})}),'Offerte aangemaakt.')}>Maak offerte</button></div></div></div><div className="space"/><div className="panel"><div className="list">{data.quotes.length?data.quotes.map((q:Row)=><Card key={q.id}><div className="cardTop"><div><div className="title">{q.number||q.title||'Offerte'}</div><div className="meta">{customerName(q.customer_id)} · {dt(q.created_at)}</div></div><span className="badge">{q.status||'—'}</span></div><div className="details"><div className="detail"><b>Totaal</b><span>{eur(q.total_cents)}</span></div><div className="detail"><b>Geldig tot</b><span>{dt(q.expires_at)}</span></div></div><div className="tools"><a className="btn small link" target="_blank" href={'/api/quote-pdf?id='+encodeURIComponent(q.id)}>Open PDF</a></div></Card>):<Empty>Geen offertes.</Empty>}</div></div></>}

    {tab==='appointments'&&<><div className="panel"><div className="heading"><h2>Nieuwe afspraak</h2></div><div className="formGrid"><div className="formItem wide"><label className="label">Lead</label><select className="select" value={appointment.lead_id} onChange={e=>setAppointment({...appointment,lead_id:e.target.value})}><option value="">— geen —</option>{data.leads.map((x:Row)=><option key={x.id} value={x.id}>{x.company||x.name||x.email}</option>)}</select></div><div className="formItem wide"><label className="label">Klant</label><select className="select" value={appointment.customer_id} onChange={e=>setAppointment({...appointment,customer_id:e.target.value})}><option value="">— geen —</option>{data.customers.map((x:Row)=><option key={x.id} value={x.id}>{x.company||x.name||x.email}</option>)}</select></div><div className="formItem"><label className="label">Start</label><input className="input" type="datetime-local" value={appointment.starts_at} onChange={e=>setAppointment({...appointment,starts_at:e.target.value})}/></div><div className="formItem wide"><label className="label">Dienst</label><input className="input" value={appointment.service} onChange={e=>setAppointment({...appointment,service:e.target.value})}/></div><div className="formItem wide"><label className="label">Adres</label><input className="input" value={appointment.address} onChange={e=>setAppointment({...appointment,address:e.target.value})}/></div><div className="formItem"><label className="label">Postcode</label><input className="input" value={appointment.postcode} onChange={e=>setAppointment({...appointment,postcode:e.target.value})}/></div><div className="formItem"><label className="label">Voertuig</label><input className="input" value={appointment.vehicle} onChange={e=>setAppointment({...appointment,vehicle:e.target.value})}/></div><div className="formItem"><label className="label">Prijs (€)</label><input className="input" type="number" step="0.01" value={appointment.price} onChange={e=>setAppointment({...appointment,price:e.target.value})}/></div><div className="formItem"><button className="btn primary" onClick={()=>run(()=>api('/appointments',{method:'POST',body:JSON.stringify({lead_id:appointment.lead_id||null,customer_id:appointment.customer_id||null,starts_at:new Date(appointment.starts_at).toISOString(),duration_minutes:120,service_id:appointment.service,address:appointment.address,postcode:appointment.postcode,vehicle:appointment.vehicle,price_cents:Math.round(Number(appointment.price||0)*100)})}),'Afspraak geregistreerd.')}>Plan afspraak</button></div></div></div><div className="space"/><div className="panel"><div className="list">{data.appointments.length?data.appointments.map((a:Row)=><Card key={a.id}><div className="cardTop"><div><div className="title">{a.service_id||a.vehicle||'Afspraak'}</div><div className="meta">{customerName(a.customer_id)} · {dt(a.starts_at)}</div></div><span className="badge">{a.status||'—'}</span></div><div className="details"><div className="detail"><b>Adres</b><span>{[a.address,a.postcode].filter(Boolean).join(' ')||'—'}</span></div><div className="detail"><b>Provider</b><span>{a.provider||'—'}</span></div><div className="detail"><b>Agenda-ID</b><span>{a.provider_booking_id||'Niet gesynchroniseerd'}</span></div></div></Card>):<Empty>Geen afspraken.</Empty>}</div></div></>}

    {tab==='fleet'&&<><div className="panel"><div className="heading"><h2>Fleet Care activeren</h2></div><div className="formGrid"><div className="formItem wide"><label className="label">Klant</label><select className="select" value={fleet.customer_id} onChange={e=>setFleet({...fleet,customer_id:e.target.value})}><option value="">— kies klant —</option>{data.customers.map((x:Row)=><option key={x.id} value={x.id}>{x.company||x.name||x.email}</option>)}</select></div><div className="formItem"><label className="label">Pakket</label><select className="select" value={fleet.package} onChange={e=>setFleet({...fleet,package:e.target.value})}><option value="weekly">Weekly Care</option><option value="biweekly">Biweekly Care</option><option value="monthly">Monthly Care</option><option value="quarterly">Quarterly Care</option></select></div><div className="formItem"><label className="label">Maandwaarde (€)</label><input className="input" type="number" step="0.01" value={fleet.monthly} onChange={e=>setFleet({...fleet,monthly:e.target.value})}/></div><div className="formItem wide"><label className="label">Volgende onderhoud</label><input className="input" type="datetime-local" value={fleet.next_visit} onChange={e=>setFleet({...fleet,next_visit:e.target.value})}/></div><div className="formItem"><button className="btn primary" onClick={()=>run(()=>api('/fleet',{method:'POST',body:JSON.stringify({customer_id:fleet.customer_id,package:fleet.package,monthly_value_cents:Math.round(Number(fleet.monthly||0)*100),next_visit_at:fleet.next_visit?new Date(fleet.next_visit).toISOString():null})}),'Fleet Care opgeslagen.')}>Opslaan</button></div></div></div><div className="space"/><div className="panel"><div className="list">{data.fleet.length?data.fleet.map((f:Row)=><Card key={f.id}><div className="cardTop"><div><div className="title">{customerName(f.customer_id)}</div><div className="meta">{f.package} · {dt(f.started_at)}</div></div><span className="badge">{f.status}</span></div><div className="details"><div className="detail"><b>Maandwaarde</b><span>{eur(f.monthly_value_cents)}</span></div><div className="detail"><b>Volgende</b><span>{dt(f.next_visit_at)}</span></div></div></Card>):<Empty>Nog geen Fleet Care.</Empty>}</div></div></>}

    {tab==='communications'&&<div className="panel"><div className="list">{data.communications.length?data.communications.map((x:Row)=><Card key={x.type+'-'+x.id}><div className="cardTop"><div><div className="title">{x.subject||x.type||x.channel||'Bericht'}</div><div className="meta">{[x.direction,x.sender,x.phone].filter(Boolean).join(' · ')} · {dt(x.created_at)}</div></div><span className="badge">{x.status||x.intent||''}</span></div><div className="meta" style={{marginTop:8,whiteSpace:'pre-wrap'}}>{String(x.text||'').slice(0,1200)}</div></Card>):<Empty>Geen recente communicatie.</Empty>}</div></div>}
    {tab==='reviews'&&<div className="panel"><div className="list">{data.reviews.length?data.reviews.map((x:Row)=><Card key={x.id}><div className="cardTop"><div className="title">{'★'.repeat(Math.max(0,Math.min(5,Number(x.rating)||0)))}</div><div className="meta">{dt(x.created_at)}</div></div><div className="meta" style={{marginTop:8}}>{x.content||'Geen tekst'}</div></Card>):<Empty>Geen reviews in productie.</Empty>}</div></div>}
    {tab==='integrations'&&<div className="panel"><div className="grid3">{data.integrations.length?data.integrations.map((x:Row)=><Card key={x.service}><div className="cardTop"><div><div className="title">{x.display_name||x.service}</div><div className="meta">{(x.capabilities||[]).join(' · ')}</div></div><span className={'badge '+(x.status==='connected'?'green':x.status==='blocked'?'red':'amber')}>{x.status}</span></div><div className="meta" style={{marginTop:8}}>Gecheckt: {dt(x.checked_at||x.updated_at)}</div></Card>):<Empty>Geen integraties.</Empty>}</div></div>}

    {busy&&<div style={{position:'fixed',right:18,bottom:18}}><div className="panel"><div className="row"><div className="spinner"/><span className="meta">Bezig…</span></div></div></div>}
    <div className="foot">LuxWash JARVIS · Render frontend · Supabase Business Engine backend</div>
  </main>
}
