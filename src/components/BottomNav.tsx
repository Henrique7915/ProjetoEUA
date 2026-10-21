import { NavLink } from 'react-router-dom'
import { CalendarDays, House, ListChecks, Sparkles, Wallet } from 'lucide-react'

const TABS = [
  { to: '/', icon: House, label: 'Início', end: true },
  { to: '/ideias', icon: Sparkles, label: 'Ideias' },
  { to: '/roteiro', icon: CalendarDays, label: 'Roteiro' },
  { to: '/gastos', icon: Wallet, label: 'Gastos' },
  { to: '/checklist', icon: ListChecks, label: 'Checklist' }
]

export function BottomNav() {
  return (
    <nav className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} aria-label="Principal">
      <ul className="mx-auto grid max-w-xl grid-cols-5">
        {TABS.map(({ to, icon: Icon, label, end }) => (
          <li key={to}>
            <NavLink to={to} end={end} className={({ isActive }) => `flex flex-col items-center gap-1 pb-2 pt-2.5 text-[11px] font-bold transition ${isActive ? 'text-brand-600' : 'text-ink/45'}`}>
              {({ isActive }) => (
                <>
                  <span className={`grid h-8 w-14 place-items-center rounded-full transition ${isActive ? 'bg-brand-100' : ''}`}>
                    <Icon size={21} strokeWidth={isActive ? 2.4 : 2} aria-hidden />
                  </span>
                  {label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
