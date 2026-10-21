import { useEffect, useMemo, useState } from 'react'
import { Check, ListChecks, Plus } from 'lucide-react'
import { Avatar, ConfirmButton, Empty, Page, Progress, Segmented, Sheet, TopBar } from '../components/ui'
import { useOpenMenu } from '../components/Menu'
import { useStore } from '../data/store'
import { taskDoneFor, taskProgress, useToggleTask } from '../data/derived'
import type { Task } from '../data/types'
import { TASK_SECTIONS } from '../content/catalog'
import { compactDate, diffDays, todayISO } from '../lib/dates'

type Filter = 'tudo' | 'minhas' | 'feitas'

export default function Checklist() {
  const openMenu = useOpenMenu()
  const { snap, members, me } = useStore()
  const [filter, setFilter] = useState<Filter>('tudo')
  const [editing, setEditing] = useState<Task | null>(null)
  const [creating, setCreating] = useState<string | null>(null)
  const all = taskProgress(snap.trip_tasks, members.length)
  const mine = taskProgress(
    snap.trip_tasks.filter((t) => t.scope === 'cada' || t.assignee === me.id),
    1
  )
  // Para "minhas", conta só a minha marcação nas tarefas de cada um.
  const myDone = snap.trip_tasks.filter((t) => (t.scope === 'cada' || t.assignee === me.id) && taskDoneFor(t, me.id)).length

  const sections = useMemo(() => {
    const visible = snap.trip_tasks.filter((t) => {
      const done = taskDoneFor(t, me.id)
      if (filter === 'feitas') return t.scope === 'cada' ? t.done_by.length >= members.length : t.done
      if (filter === 'minhas') return !done && (t.scope === 'cada' || t.assignee === me.id)
      return true
    })
    const order = [...TASK_SECTIONS, ...new Set(visible.map((t) => t.section).filter((s) => !TASK_SECTIONS.includes(s)))]
    return order.map((s) => ({ name: s, tasks: visible.filter((t) => t.section === s).sort((a, b) => a.sort - b.sort || a.created_at.localeCompare(b.created_at)) })).filter((s) => s.tasks.length)
  }, [snap.trip_tasks, filter, me.id, members.length])

  return (
    <>
      <TopBar
        title="Checklist"
        onMenu={openMenu}
        right={
          <button className="icon-btn" onClick={() => setCreating('Outros')} aria-label="Novo item">
            <Plus size={24} />
          </button>
        }
      />
      <Page>
        <div className="card">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[13px] font-bold text-ink/55">Grupo</p>
              <p className="text-[30px] font-extrabold leading-none tabular-nums">{Math.round((all.done / Math.max(all.total, 1)) * 100)}%</p>
            </div>
            <div className="text-right">
              <p className="text-[13px] font-bold text-ink/55">Você</p>
              <p className="text-lg font-extrabold tabular-nums">
                {myDone}/{mine.total}
              </p>
            </div>
          </div>
          <div className="mt-3">
            <Progress value={all.done / Math.max(all.total, 1)} label="Progresso do grupo" />
          </div>
        </div>

        <div className="mt-4">
          <Segmented
            value={filter}
            onChange={setFilter}
            label="Mostrar"
            options={[
              { id: 'tudo', label: 'Tudo' },
              { id: 'minhas', label: 'Falta eu' },
              { id: 'feitas', label: 'Concluídas' }
            ]}
          />
        </div>

        {sections.length === 0 && (
          <Empty
            icon={<ListChecks size={30} />}
            title={filter === 'minhas' ? 'Você está em dia! 🎉' : 'Nada por aqui'}
            text={filter === 'tudo' ? 'Adicione o que precisa ser feito antes da viagem.' : undefined}
            action={
              filter === 'tudo' ? (
                <button className="btn btn-primary" onClick={() => setCreating('Documentos')}>
                  <Plus size={18} /> Novo item
                </button>
              ) : undefined
            }
          />
        )}

        {sections.map((s) => (
          <section key={s.name} className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="h-section">{s.name}</h2>
              <button className="text-[13px] font-bold text-brand-600" onClick={() => setCreating(s.name)}>
                + Item
              </button>
            </div>
            <ul className="card !p-0">
              {s.tasks.map((t) => (
                <TaskRow key={t.id} task={t} onEdit={() => setEditing(t)} />
              ))}
            </ul>
          </section>
        ))}
      </Page>
      <TaskForm open={!!editing || !!creating} task={editing ?? undefined} section={creating ?? undefined} onClose={() => (setEditing(null), setCreating(null))} />
    </>
  )
}

function TaskRow({ task, onEdit }: { task: Task; onEdit: () => void }) {
  const { members, me, member } = useStore()
  const toggle = useToggleTask()
  const done = taskDoneFor(task, me.id)
  const owner = member(task.assignee)
  const overdue = task.due && !done && task.due < todayISO()
  const soon = task.due && !done && !overdue && diffDays(task.due, todayISO()) <= 14
  return (
    <li className="flex items-start gap-3 border-b border-line/60 p-3.5 last:border-0">
      <button
        onClick={() => void toggle(task)}
        aria-pressed={done}
        aria-label={done ? 'Desmarcar' : 'Marcar como feito'}
        className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border-2 transition ${done ? 'border-mint-500 bg-mint-500 text-white' : 'border-brand-300 text-transparent hover:bg-brand-50'}`}
      >
        <Check size={17} strokeWidth={3} />
      </button>
      <button onClick={onEdit} className="min-w-0 flex-1 text-left">
        <span className={`block font-bold leading-snug ${done ? 'text-ink/45 line-through' : ''}`}>{task.title}</span>
        {task.note && <span className="mt-0.5 block text-[12.5px] leading-snug text-ink/55">{task.note}</span>}
        <span className="mt-1.5 flex flex-wrap items-center gap-2">
          {task.scope === 'cada' ? (
            <span className="inline-flex items-center gap-1" aria-label={`${task.done_by.length} de ${members.length} fizeram`}>
              {members.map((m) => (
                <span key={m.id} className={task.done_by.includes(m.id) ? '' : 'opacity-25 grayscale'}>
                  <Avatar member={m} size={20} />
                </span>
              ))}
              <span className="ml-1 text-[12px] font-bold text-ink/50">
                {task.done_by.length}/{members.length}
              </span>
            </span>
          ) : owner ? (
            <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-ink/55">
              <Avatar member={owner} size={20} /> {owner.id === me.id ? 'você' : owner.name.split(' ')[0]}
            </span>
          ) : (
            <span className="text-[12px] font-bold text-ink/40">Sem responsável</span>
          )}
          {task.due && (
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${overdue ? 'bg-danger-500/10 text-danger-600' : soon ? 'bg-sun-400/20 text-sun-600' : 'bg-shell text-ink/55'}`}>
              até {compactDate(task.due)}
            </span>
          )}
        </span>
      </button>
    </li>
  )
}

function TaskForm({ open, onClose, task, section }: { open: boolean; onClose: () => void; task?: Task; section?: string }) {
  const { members, add, patch, remove, snap, showToast } = useStore()
  const init = () => ({
    title: task?.title ?? '',
    section: task?.section ?? section ?? 'Outros',
    scope: task?.scope ?? ('grupo' as Task['scope']),
    assignee: task?.assignee ?? '',
    due: task?.due ?? '',
    note: task?.note ?? ''
  })
  const [f, setF] = useState(init)
  useEffect(() => {
    if (open) setF(init())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, task, section])
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }))
  const sections = [...new Set([...TASK_SECTIONS, ...snap.trip_tasks.map((t) => t.section)])]

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!f.title.trim()) return showToast('Escreva o item.')
    const row = { title: f.title.trim(), section: f.section.trim() || 'Outros', scope: f.scope, assignee: f.scope === 'grupo' ? f.assignee || null : null, due: f.due || null, note: f.note.trim() }
    const ok = task ? await patch('trip_tasks', task.id, row) : !!(await add('trip_tasks', { ...row, sort: snap.trip_tasks.length }))
    if (ok) onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={task ? 'Editar item' : 'Novo item'}
      footer={
        <div className="flex gap-2">
          {task && (
            <ConfirmButton confirmLabel="Apagar mesmo?" onConfirm={async () => (await remove('trip_tasks', task.id)) && onClose()}>
              Apagar
            </ConfirmButton>
          )}
          <button type="submit" form="task-form" className="btn btn-primary flex-1">
            Salvar
          </button>
        </div>
      }
    >
      <form id="task-form" onSubmit={save} className="space-y-5">
        <div>
          <label className="label" htmlFor="tk-title">
            O que precisa fazer
          </label>
          <input id="tk-title" className="input" value={f.title} onChange={(e) => set('title', e.target.value)} maxLength={200} autoFocus={!task} />
        </div>
        <div>
          <p className="label">Quem faz</p>
          <Segmented
            value={f.scope}
            onChange={(v) => set('scope', v)}
            label="Quem faz"
            options={[
              { id: 'grupo', label: 'Uma pessoa pelo grupo' },
              { id: 'cada', label: 'Cada um o seu' }
            ]}
          />
          <p className="mt-1.5 text-[12.5px] text-ink/50">{f.scope === 'cada' ? 'Ex.: passaporte, visto, seguro. Cada pessoa marca o seu.' : 'Ex.: reservar hotel. Quando alguém marca, fica feito para todos.'}</p>
        </div>
        {f.scope === 'grupo' && (
          <div>
            <p className="label">Responsável</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" aria-pressed={!f.assignee} onClick={() => set('assignee', '')} className={`rounded-full px-3.5 py-2 text-[13px] font-bold ${!f.assignee ? 'bg-brand-500 text-onbrand' : 'bg-surface ring-1 ring-line'}`}>
                Ninguém ainda
              </button>
              {members.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={f.assignee === m.id}
                  onClick={() => set('assignee', m.id)}
                  className={`inline-flex items-center gap-1.5 rounded-full py-1.5 pl-1.5 pr-3 text-[13px] font-bold ${f.assignee === m.id ? 'bg-brand-500 text-onbrand' : 'bg-surface ring-1 ring-line'}`}
                >
                  <Avatar member={m} size={24} /> {m.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="tk-section">
              Seção
            </label>
            <input id="tk-section" className="input" list="tk-sections" value={f.section} onChange={(e) => set('section', e.target.value)} maxLength={40} />
            <datalist id="tk-sections">
              {sections.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="label" htmlFor="tk-due">
              Prazo
            </label>
            <input id="tk-due" type="date" className="input" value={f.due} onChange={(e) => set('due', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="tk-note">
            Detalhes
          </label>
          <textarea id="tk-note" rows={3} className="input" value={f.note} onChange={(e) => set('note', e.target.value)} maxLength={2000} />
        </div>
      </form>
    </Sheet>
  )
}
