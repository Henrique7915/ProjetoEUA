import { useEffect, useId, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Menu, X } from 'lucide-react'
import type { Member } from '../data/types'

export function TopBar({ title, back, right, onMenu }: { title: ReactNode; back?: boolean | string; right?: ReactNode; onMenu?: () => void }) {
  const navigate = useNavigate()
  return (
    <header className="no-print sticky top-0 z-20 bg-paper/95 backdrop-blur-sm" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="mx-auto grid h-14 max-w-xl grid-cols-[48px_1fr_auto] items-center gap-1 px-2">
        <div>
          {back && (
            <button onClick={() => (typeof back === 'string' ? navigate(back) : navigate(-1))} className="icon-btn" aria-label="Voltar">
              <ChevronLeft size={26} />
            </button>
          )}
        </div>
        <h1 className="truncate text-center text-[17px] font-bold">{title}</h1>
        <div className="flex min-w-[48px] justify-end">
          {right}
          {onMenu && (
            <button onClick={onMenu} className="icon-btn" aria-label="Abrir menu">
              <Menu size={24} />
            </button>
          )}
        </div>
      </div>
    </header>
  )
}

export function Page({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <main className={`pb-nav mx-auto max-w-xl px-4 ${className}`}>{children}</main>
}

export function Toast({ message }: { message: string | null }) {
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 z-[60] flex justify-center px-4" style={{ bottom: 'calc(6.5rem + env(safe-area-inset-bottom))' }}>
      {message && <div className="max-w-sm rounded-2xl bg-ink px-4 py-3 text-center text-sm font-semibold text-paper shadow-lg">{message}</div>}
    </div>
  )
}

export function Spinner({ label = 'Carregando' }: { label?: string }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-paper" role="status" aria-label={label}>
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-100 border-t-brand-500" />
    </div>
  )
}

export function Stat({ label, value, hint, tone = 'text-ink' }: { label: string; value: ReactNode; hint?: ReactNode; tone?: string }) {
  return (
    <div className="rounded-2xl bg-surface p-4 ring-1 ring-line/80">
      <p className="text-[13px] font-semibold text-ink/55">{label}</p>
      <p className={`mt-1 text-[clamp(15px,4.4vw,22px)] font-extrabold leading-tight tracking-tight tabular-nums ${tone}`}>{value}</p>
      {hint && <p className="mt-0.5 text-[12px] font-semibold text-ink/50">{hint}</p>}
    </div>
  )
}

/** Folha que sobe de baixo (no computador, fica centralizada). */
export function Sheet({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode }) {
  const id = useId()
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby={id}>
      <button className="absolute inset-0 bg-ink/35" aria-label="Fechar" onClick={onClose} tabIndex={-1} />
      <div className="relative flex max-h-[92dvh] w-full max-w-xl flex-col rounded-t-[28px] bg-paper shadow-sheet sm:rounded-[28px]">
        <div className="flex items-center justify-between gap-2 px-5 pb-2 pt-4">
          <h2 id={id} className="truncate text-lg font-extrabold">
            {title}
          </h2>
          <button onClick={onClose} className="icon-btn -mr-2 shrink-0" aria-label="Fechar">
            <X size={22} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 pb-5">{children}</div>
        {footer && (
          <div className="border-t border-line px-5 pt-3" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export function Avatar({ member, size = 32, ring = false }: { member?: Member | null; size?: number; ring?: boolean }) {
  const name = member?.name ?? '?'
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
  return (
    <span
      className={`inline-grid shrink-0 place-items-center rounded-full font-extrabold text-white ${ring ? 'ring-2 ring-surface' : ''}`}
      style={{ width: size, height: size, background: member?.color ?? '#94A3B8', fontSize: size * (member?.emoji ? 0.5 : 0.4) }}
      title={name}
      aria-label={name}
    >
      {member?.emoji || initials}
    </span>
  )
}

export function AvatarStack({ members, size = 24, max = 5 }: { members: (Member | undefined)[]; size?: number; max?: number }) {
  const list = members.filter(Boolean) as Member[]
  return (
    <span className="inline-flex items-center">
      {list.slice(0, max).map((m, i) => (
        <span key={m.id} style={{ marginLeft: i ? -size / 3 : 0 }}>
          <Avatar member={m} size={size} ring />
        </span>
      ))}
      {list.length > max && <span className="ml-1 text-[12px] font-bold text-ink/55">+{list.length - max}</span>}
    </span>
  )
}

export function Empty({ icon, title, text, action }: { icon: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-3xl bg-brand-50 text-brand-600">{icon}</span>
      <p className="mt-4 text-lg font-extrabold">{title}</p>
      {text && <p className="mt-1 max-w-xs text-[15px] text-ink/60">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

/** Fileira de pílulas roláveis (filtros). */
export function Chips<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { id: T; label: ReactNode; count?: number }[]; label: string }) {
  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-1" role="radiogroup" aria-label={label}>
      {options.map((o) => {
        const on = o.id === value
        return (
          <button
            key={o.id}
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.id)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-bold transition ${on ? 'bg-brand-500 text-onbrand' : 'bg-surface text-ink/70 ring-1 ring-line hover:bg-brand-50'}`}
          >
            {o.label}
            {o.count != null && <span className={`tabular-nums ${on ? 'text-onbrand/80' : 'text-ink/40'}`}>{o.count}</span>}
          </button>
        )
      })}
    </div>
  )
}

/** Botões lado a lado, um escolhido. */
export function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { id: T; label: ReactNode }[]; label: string }) {
  return (
    <div className="flex rounded-full bg-shell p-1" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={o.id === value}
          onClick={() => onChange(o.id)}
          className={`flex-1 rounded-full px-3 py-2 text-[13px] font-bold transition ${o.id === value ? 'bg-surface text-brand-700 shadow-sm ring-1 ring-line' : 'text-ink/55'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Botão que pede um segundo toque para confirmar (apagar etc.). */
export function ConfirmButton({ onConfirm, children, confirmLabel = 'Toque de novo para confirmar', className = 'btn btn-danger' }: { onConfirm: () => void; children: ReactNode; confirmLabel?: string; className?: string }) {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const id = window.setTimeout(() => setArmed(false), 3500)
    return () => window.clearTimeout(id)
  }, [armed])
  return (
    <button type="button" className={className} onClick={() => (armed ? onConfirm() : setArmed(true))}>
      {armed ? confirmLabel : children}
    </button>
  )
}

export function Progress({ value, tone = 'bg-brand-500', label }: { value: number; tone?: string; label?: string }) {
  const pct = Math.max(0, Math.min(1, value)) * 100
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-shell" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className={`h-full rounded-full transition-all ${tone}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 mt-7 flex items-center justify-between gap-3">
      <h2 className="h-section">{children}</h2>
      {action}
    </div>
  )
}
