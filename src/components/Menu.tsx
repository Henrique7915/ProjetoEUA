import { createContext, useContext, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeftRight, BookOpen, Map as MapIcon, Repeat, Settings2, Users, Vote, LogOut } from 'lucide-react'
import { useStore } from '../data/store'
import { Avatar, Sheet } from './ui'

const MenuCtx = createContext<() => void>(() => {})
export const useOpenMenu = () => useContext(MenuCtx)

const ITEMS = [
  { to: '/mapa', icon: MapIcon, label: 'Mapa', hint: 'Tudo que tem endereço, por categoria e por dia' },
  { to: '/enquetes', icon: Vote, label: 'Enquetes', hint: 'Datas, hotel, parque: decidam juntos' },
  { to: '/cambio', icon: ArrowLeftRight, label: 'Câmbio', hint: 'Dólar e dólar canadense em reais, com IOF' },
  { to: '/guia', icon: BookOpen, label: 'Guia da viagem', hint: 'Visto, eTA, gorjeta, carro, tomada...' },
  { to: '/grupo', icon: Users, label: 'Grupo e convite', hint: 'Pessoas, cidades, datas e link de convite' },
  { to: '/ajustes', icon: Settings2, label: 'Ajustes', hint: 'Tema, exportar dados, apagar viagem' }
]

export function MenuProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const { me, trip, switchMember, leave } = useStore()

  return (
    <MenuCtx.Provider value={() => setOpen(true)}>
      {children}
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={
          <span className="flex items-center gap-2.5">
            <Avatar member={me} size={30} />
            Oi, {me.name}
          </span>
        }
      >
        <p className="-mt-1 mb-3 text-sm font-semibold text-ink/55">
          {trip.emoji} {trip.name}
        </p>
        <ul className="space-y-2">
          {ITEMS.map(({ to, icon: Icon, label, hint }) => (
            <li key={to}>
              <Link to={to} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-2xl bg-surface p-3.5 ring-1 ring-line/80 hover:bg-brand-50/60">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                  <Icon size={20} aria-hidden />
                </span>
                <span>
                  <span className="block font-bold">{label}</span>
                  <span className="block text-[13px] text-ink/55">{hint}</span>
                </span>
              </Link>
            </li>
          ))}
          <li className="grid grid-cols-2 gap-2 pt-1">
            <button onClick={switchMember} className="flex items-center justify-center gap-2 rounded-2xl p-3 text-sm font-bold text-ink/70 hover:bg-shell">
              <Repeat size={18} aria-hidden /> Não sou {me.name.split(' ')[0]}
            </button>
            <button onClick={leave} className="flex items-center justify-center gap-2 rounded-2xl p-3 text-sm font-bold text-ink/70 hover:bg-shell">
              <LogOut size={18} aria-hidden /> Outra viagem
            </button>
          </li>
        </ul>
      </Sheet>
    </MenuCtx.Provider>
  )
}
