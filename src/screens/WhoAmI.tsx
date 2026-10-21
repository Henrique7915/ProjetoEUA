import { useState } from 'react'
import { ArrowRight, ChevronRight } from 'lucide-react'
import { useRawStore } from '../data/store'
import { Avatar, Toast } from '../components/ui'
import { MEMBER_COLORS } from '../content/catalog'

/** "Login" da viagem: escolher o próprio nome ou entrar como pessoa nova. */
export default function WhoAmI() {
  const { trip, members, add, pickMember, leave, toast } = useRawStore()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  const join = async (e: React.FormEvent) => {
    e.preventDefault()
    const clean = name.trim()
    if (!clean) return
    const existing = members.find((m) => m.name.trim().toLowerCase() === clean.toLowerCase())
    if (existing) return pickMember(existing.id)
    setBusy(true)
    const color = MEMBER_COLORS.find((c) => !members.some((m) => m.color === c)) ?? MEMBER_COLORS[members.length % MEMBER_COLORS.length]
    const m = await add('trip_members', { name: clean, color })
    setBusy(false)
    if (m) pickMember(m.id)
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-6 py-10">
      <p className="text-4xl">{trip.emoji}</p>
      <p className="mt-3 text-sm font-bold uppercase tracking-wider text-brand-600">{trip.name}</p>
      <h1 className="mt-1 text-[30px] font-extrabold leading-tight tracking-tight">Quem é você?</h1>
      <p className="mt-2 text-ink/65">Escolha seu nome para o grupo saber quem votou, quem pagou e quem fez cada coisa.</p>

      {members.length > 0 && (
        <ul className="mt-8 space-y-2">
          {members.map((m) => (
            <li key={m.id}>
              <button onClick={() => pickMember(m.id)} className="flex w-full items-center gap-3 rounded-2xl bg-surface p-3.5 text-left ring-1 ring-line hover:bg-brand-50/60">
                <Avatar member={m} size={40} />
                <span className="flex-1 text-[17px] font-bold">{m.name}</span>
                <ChevronRight className="text-ink/35" size={20} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={join} className="mt-8">
        <label htmlFor="new-name" className="label">
          {members.length ? 'Ainda não está na lista?' : 'Seu nome'}
        </label>
        <div className="flex gap-2">
          <input id="new-name" className="input" placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoComplete="given-name" />
          <button type="submit" disabled={busy || !name.trim()} className="btn btn-primary shrink-0 !px-4" aria-label="Entrar">
            <ArrowRight size={20} />
          </button>
        </div>
      </form>

      <button onClick={leave} className="btn btn-ghost mt-auto">
        Entrar em outra viagem
      </button>
      <Toast message={toast} />
    </main>
  )
}
