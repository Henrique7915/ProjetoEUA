import { useState } from 'react'
import { Check, Lock, LockOpen, Plus, Trash2, Vote as VoteIcon, X } from 'lucide-react'
import { AvatarStack, ConfirmButton, Empty, Page, Sheet, TopBar } from '../components/ui'
import { useOpenMenu } from '../components/Menu'
import { useStore } from '../data/store'
import type { Poll } from '../data/types'
import { ago } from '../lib/dates'

export default function Polls() {
  const openMenu = useOpenMenu()
  const { snap } = useStore()
  const [creating, setCreating] = useState(false)
  const polls = [...snap.trip_polls].sort((a, b) => Number(a.closed) - Number(b.closed) || b.created_at.localeCompare(a.created_at))
  return (
    <>
      <TopBar
        title="Enquetes"
        back
        onMenu={openMenu}
        right={
          <button className="icon-btn" onClick={() => setCreating(true)} aria-label="Nova enquete">
            <Plus size={24} />
          </button>
        }
      />
      <Page>
        {polls.length === 0 && (
          <Empty
            icon={<VoteIcon size={30} />}
            title="Nenhuma enquete"
            text="Qual mês? Qual hotel? Disney ou Universal? Pergunte e todo mundo vota."
            action={
              <button className="btn btn-primary" onClick={() => setCreating(true)}>
                <Plus size={18} /> Criar enquete
              </button>
            }
          />
        )}
        <div className="space-y-4">
          {polls.map((p) => (
            <PollCard key={p.id} poll={p} />
          ))}
        </div>
      </Page>
      <PollForm open={creating} onClose={() => setCreating(false)} />
    </>
  )
}

function PollCard({ poll }: { poll: Poll }) {
  const { snap, members, me, member, add, remove, patch } = useStore()
  const votes = snap.trip_poll_votes.filter((v) => v.poll_id === poll.id)
  const voters = new Set(votes.map((v) => v.member_id))
  const max = Math.max(1, ...poll.options.map((o) => votes.filter((v) => v.option_id === o.id).length))
  const by = member(poll.created_by)

  const choose = async (optionId: string) => {
    if (poll.closed) return
    const mine = votes.filter((v) => v.member_id === me.id)
    const same = mine.find((v) => v.option_id === optionId)
    if (same) return void remove('trip_poll_votes', same.id)
    if (!poll.multi) for (const v of mine) await remove('trip_poll_votes', v.id)
    await add('trip_poll_votes', { poll_id: poll.id, member_id: me.id, option_id: optionId })
  }

  return (
    <article className={`card ${poll.closed ? 'opacity-80' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-[18px] font-extrabold leading-snug">{poll.question}</h2>
          <p className="mt-0.5 text-[12.5px] font-semibold text-ink/50">
            {poll.closed ? '🔒 Encerrada · ' : poll.multi ? 'Pode marcar várias · ' : 'Uma opção · '}
            {voters.size}/{members.length} votaram{by ? ` · ${by.name.split(' ')[0]}, ${ago(poll.created_at)}` : ''}
          </p>
        </div>
      </div>
      <ul className="mt-4 space-y-2">
        {poll.options.map((o) => {
          const list = votes.filter((v) => v.option_id === o.id)
          const mine = list.some((v) => v.member_id === me.id)
          const leader = list.length === max && list.length > 0
          return (
            <li key={o.id}>
              <button
                onClick={() => void choose(o.id)}
                disabled={poll.closed}
                aria-pressed={mine}
                className={`relative w-full overflow-hidden rounded-2xl p-3 text-left ring-1 transition ${mine ? 'ring-2 ring-brand-400' : 'ring-line'} bg-surface`}
              >
                <span className={`absolute inset-y-0 left-0 ${leader ? 'bg-brand-100' : 'bg-shell'}`} style={{ width: `${(list.length / Math.max(members.length, 1)) * 100}%` }} />
                <span className="relative flex items-center gap-2.5">
                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 ${mine ? 'border-brand-500 bg-brand-500 text-onbrand' : 'border-line text-transparent'}`}>
                    <Check size={14} strokeWidth={3} />
                  </span>
                  <span className="flex-1 font-bold">{o.text}</span>
                  <AvatarStack members={list.map((v) => member(v.member_id))} size={22} max={4} />
                  <span className="w-6 text-right font-extrabold tabular-nums">{list.length}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      <div className="mt-3 flex justify-end gap-1">
        <button onClick={() => void patch('trip_polls', poll.id, { closed: !poll.closed })} className="btn btn-ghost !px-3 !py-2 text-[13px]">
          {poll.closed ? <LockOpen size={16} /> : <Lock size={16} />} {poll.closed ? 'Reabrir' : 'Encerrar'}
        </button>
        <ConfirmButton className="btn btn-ghost !px-3 !py-2 text-[13px] text-danger-600" confirmLabel="Apagar?" onConfirm={() => void remove('trip_polls', poll.id)}>
          <Trash2 size={16} /> Apagar
        </ConfirmButton>
      </div>
    </article>
  )
}

function PollForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { add, me, showToast } = useStore()
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [multi, setMulti] = useState(false)

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    const opts = options.map((o) => o.trim()).filter(Boolean)
    if (!question.trim()) return showToast('Escreva a pergunta.')
    if (opts.length < 2) return showToast('Coloque pelo menos 2 opções.')
    const ok = await add('trip_polls', { question: question.trim(), options: opts.map((text, i) => ({ id: `o${i + 1}`, text })), multi, created_by: me.id })
    if (ok) {
      setQuestion('')
      setOptions(['', ''])
      setMulti(false)
      onClose()
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Nova enquete"
      footer={
        <button type="submit" form="poll-form" className="btn btn-primary w-full">
          Criar enquete
        </button>
      }
    >
      <form id="poll-form" onSubmit={save} className="space-y-5">
        <div>
          <label className="label" htmlFor="pl-q">
            Pergunta
          </label>
          <input id="pl-q" className="input" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ex.: Qual parque no primeiro dia?" maxLength={200} autoFocus />
        </div>
        <div>
          <p className="label">Opções</p>
          <ul className="space-y-2">
            {options.map((o, i) => (
              <li key={i} className="flex gap-2">
                <input className="input" value={o} onChange={(e) => setOptions(options.map((x, j) => (j === i ? e.target.value : x)))} placeholder={`Opção ${i + 1}`} maxLength={120} aria-label={`Opção ${i + 1}`} />
                {options.length > 2 && (
                  <button type="button" className="icon-btn shrink-0" onClick={() => setOptions(options.filter((_, j) => j !== i))} aria-label="Tirar opção">
                    <X size={20} />
                  </button>
                )}
              </li>
            ))}
          </ul>
          {options.length < 12 && (
            <button type="button" className="mt-2 text-[14px] font-bold text-brand-600" onClick={() => setOptions([...options, ''])}>
              + Opção
            </button>
          )}
        </div>
        <label className="flex items-center gap-3 font-bold">
          <input type="checkbox" checked={multi} onChange={(e) => setMulti(e.target.checked)} className="h-5 w-5 accent-[rgb(var(--brand-500))]" />
          Cada um pode marcar mais de uma
        </label>
      </form>
    </Sheet>
  )
}
