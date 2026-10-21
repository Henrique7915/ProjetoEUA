import { useEffect, useState } from 'react'
import { ArrowRight, Check, ChevronRight, KeyRound, Plus } from 'lucide-react'
import { Logo } from '../components/Logo'
import { normalizeCode, type Gateway } from '../data/backend'
import { savedTrips, type Session } from '../data/session'
import { CHECKLIST_TEMPLATE, DESTINATIONS, TRIP_EMOJIS } from '../content/catalog'
import { prettyCode } from '../lib/invite'
import { addDays, diffDays } from '../lib/dates'

/** Divide os dias da viagem entre as cidades, em sequência (a última fica com a sobra). Dá para ajustar depois. */
function splitDays(start: string, end: string, n: number): [string, string][] {
  if (!n) return []
  const total = diffDays(end, start) + 1
  const each = Math.max(1, Math.floor(total / n))
  return Array.from({ length: n }, (_, i) => {
    const from = addDays(start, Math.min(i * each, total - 1))
    const to = i === n - 1 ? end : addDays(start, Math.min((i + 1) * each - 1, total - 1))
    return [from, to]
  })
}

type View = 'home' | 'join' | 'create'

export default function Entry({ gateway, initialCode, onEnter }: { gateway: Gateway; initialCode?: string; onEnter: (s: Session) => void }) {
  const [view, setView] = useState<View>(initialCode ? 'join' : 'home')
  const recent = savedTrips()

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-6 py-10">
      <div className="flex items-center gap-3">
        <Logo size={52} />
        <div>
          <p className="text-[22px] font-extrabold leading-tight tracking-tight">Viagem da Galera</p>
          <p className="text-sm font-semibold text-ink/55">Planejem juntos, sem planilha</p>
        </div>
      </div>

      {view === 'home' && (
        <>
          <h1 className="mt-10 text-[30px] font-extrabold leading-tight tracking-tight">Para onde vamos? 🌴🍁</h1>
          <p className="mt-2 text-ink/65">Links, roteiro, mapa, gastos divididos, checklist e enquetes. Cada um entra só com o nome.</p>

          {recent.length > 0 && (
            <section className="mt-8">
              <p className="label">Suas viagens neste aparelho</p>
              <ul className="space-y-2">
                {recent.map((t) => (
                  <li key={t.code}>
                    <button onClick={() => onEnter({ code: t.code, memberId: t.memberId })} className="flex w-full items-center gap-3 rounded-2xl bg-surface p-3.5 text-left ring-1 ring-line hover:bg-brand-50/60">
                      <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-2xl">{t.emoji}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-bold">{t.name || 'Viagem'}</span>
                        <span className="block text-[13px] text-ink/50">{prettyCode(t.code)}</span>
                      </span>
                      <ChevronRight className="text-ink/35" size={20} />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="mt-8 space-y-3">
            <button onClick={() => setView('create')} className="btn btn-primary w-full">
              <Plus size={19} /> Criar uma viagem
            </button>
            <button onClick={() => setView('join')} className="btn btn-line w-full">
              <KeyRound size={18} /> Tenho um código de convite
            </button>
          </div>
          {gateway.local && <LocalNote />}
        </>
      )}

      {view === 'join' && <Join gateway={gateway} initialCode={initialCode} onBack={() => setView('home')} onEnter={onEnter} />}
      {view === 'create' && <Create gateway={gateway} onBack={() => setView('home')} onEnter={onEnter} />}
    </main>
  )
}

function LocalNote() {
  return (
    <p className="mt-8 rounded-2xl bg-sun-400/15 p-3 text-[13px] font-semibold text-sun-600">
      Modo de teste: sem Supabase configurado, os dados ficam só neste navegador. Abra outra aba para simular outra pessoa.
    </p>
  )
}

function Join({ gateway, initialCode, onBack, onEnter }: { gateway: Gateway; initialCode?: string; onBack: () => void; onEnter: (s: Session) => void }) {
  const [code, setCode] = useState(initialCode ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (value = code) => {
    const c = normalizeCode(value)
    if (c.length < 10) return setError('O código tem 12 letras e números.')
    setBusy(true)
    setError('')
    try {
      const trip = await gateway.findTrip(c)
      if (!trip) return setError('Não achei nenhuma viagem com esse código. Confira com quem te convidou.')
      const saved = savedTrips().find((t) => t.code === c)
      onEnter({ code: c, memberId: saved?.memberId ?? null })
    } catch {
      setError('Não consegui conferir agora. Veja sua internet.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (initialCode) void submit(initialCode)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <form
      className="mt-10"
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
    >
      <h1 className="text-[28px] font-extrabold leading-tight tracking-tight">Entrar na viagem</h1>
      <p className="mt-2 text-ink/65">Cole o código ou o link que mandaram no grupo.</p>
      <label htmlFor="code" className="label mt-8">
        Código
      </label>
      <input
        id="code"
        className="input text-center font-mono text-xl uppercase tracking-[0.2em]"
        placeholder="XXXX-XXXX-XXXX"
        autoComplete="off"
        autoCapitalize="characters"
        value={code}
        onChange={(e) => {
          const v = e.target.value
          const fromLink = v.match(/entrar\/([A-Za-z0-9-]+)/)
          setCode(fromLink ? fromLink[1] : v)
        }}
      />
      {error && <p className="mt-3 rounded-2xl bg-danger-500/10 p-3 text-sm font-semibold text-danger-600">{error}</p>}
      <button type="submit" disabled={busy} className="btn btn-primary mt-5 w-full">
        {busy ? 'Conferindo…' : 'Entrar'} <ArrowRight size={18} />
      </button>
      <button type="button" onClick={onBack} className="btn btn-ghost mt-2 w-full">
        Voltar
      </button>
    </form>
  )
}

function Create({ gateway, onBack, onEnter }: { gateway: Gateway; onBack: () => void; onEnter: (s: Session) => void }) {
  const [name, setName] = useState('Flórida + Canadá')
  const [emoji, setEmoji] = useState('🌴')
  const [me, setMe] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [cities, setCities] = useState<string[]>(['Orlando', 'Miami', 'Toronto'])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const toggle = (c: string) => setCities((l) => (l.includes(c) ? l.filter((x) => x !== c) : [...l, c]))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!me.trim()) return setError('Diga seu nome para o grupo saber quem é quem.')
    if (start && end && end < start) return setError('A volta precisa ser depois da ida.')
    setBusy(true)
    setError('')
    try {
      const created = await gateway.createTrip({ name: name.trim() || 'Nossa viagem', member: me.trim(), start: start || null, end: end || null, emoji })
      const backend = gateway.open(created.code)
      await backend.load()
      // Começa com a checklist, as cidades escolhidas e (se não tem data) uma enquete de mês.
      await backend.insertMany(
        'trip_tasks',
        CHECKLIST_TEMPLATE.map((t, i) => ({ ...t, sort: i }))
      )
      const chosen = DESTINATIONS.filter((d) => cities.includes(d.city))
      const ranges = start && end ? splitDays(start, end, chosen.length) : []
      await backend.insertMany(
        'trip_stops',
        chosen.map((d, i) => ({ city: d.city, country: d.country, lat: d.lat, lng: d.lng, sort: i, start_date: ranges[i]?.[0] ?? null, end_date: ranges[i]?.[1] ?? null }))
      )
      if (!start) {
        await backend.insert('trip_polls', {
          question: 'Qual mês a gente vai?',
          multi: true,
          created_by: created.member_id,
          options: [
            { id: 'jun', text: 'Junho de 2027' },
            { id: 'jul', text: 'Julho de 2027' },
            { id: 'ago', text: 'Agosto de 2027' }
          ]
        })
      }
      onEnter({ code: created.code, memberId: created.member_id })
    } catch {
      setError('Não consegui criar a viagem. Confira a internet e tente de novo.')
      setBusy(false)
    }
  }

  return (
    <form className="mt-8 space-y-5" onSubmit={submit}>
      <h1 className="text-[28px] font-extrabold leading-tight tracking-tight">Nova viagem</h1>
      <div>
        <label htmlFor="trip-name" className="label">
          Nome da viagem
        </label>
        <input id="trip-name" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
        <div className="mt-2 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Ícone da viagem">
          {TRIP_EMOJIS.map((em) => (
            <button
              key={em}
              type="button"
              role="radio"
              aria-checked={em === emoji}
              onClick={() => setEmoji(em)}
              className={`grid h-10 w-10 place-items-center rounded-xl text-xl transition ${em === emoji ? 'bg-brand-100 ring-2 ring-brand-400' : 'bg-surface ring-1 ring-line'}`}
            >
              {em}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label htmlFor="me" className="label">
          Seu nome
        </label>
        <input id="me" className="input" placeholder="Como a galera te chama" value={me} onChange={(e) => setMe(e.target.value)} maxLength={40} autoComplete="given-name" />
      </div>
      <div>
        <p className="label">Datas (pode deixar para depois)</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-[13px] font-semibold text-ink/55">
            Ida
            <input type="date" className="input mt-1" value={start} onChange={(e) => setStart(e.target.value)} />
          </label>
          <label className="text-[13px] font-semibold text-ink/55">
            Volta
            <input type="date" className="input mt-1" value={end} min={start || undefined} onChange={(e) => setEnd(e.target.value)} />
          </label>
        </div>
        {!start && <p className="mt-2 text-[13px] text-ink/55">Sem data? Criamos uma enquete "Qual mês a gente vai?" para o grupo votar.</p>}
      </div>
      <div>
        <p className="label">Cidades</p>
        <div className="flex flex-wrap gap-2">
          {DESTINATIONS.map((d) => {
            const on = cities.includes(d.city)
            return (
              <button
                key={d.city}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(d.city)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-bold transition ${on ? 'bg-brand-500 text-onbrand' : 'bg-surface text-ink/70 ring-1 ring-line'}`}
              >
                {on && <Check size={14} />}
                {d.country === 'US' ? '🇺🇸' : '🇨🇦'} {d.city}
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-[13px] text-ink/55">Dá para mudar a ordem, as datas e adicionar outras depois.</p>
      </div>
      {error && <p className="rounded-2xl bg-danger-500/10 p-3 text-sm font-semibold text-danger-600">{error}</p>}
      <button type="submit" disabled={busy} className="btn btn-primary w-full">
        {busy ? 'Criando…' : 'Criar e convidar a galera'}
      </button>
      <button type="button" onClick={onBack} className="btn btn-ghost w-full">
        Voltar
      </button>
    </form>
  )
}
