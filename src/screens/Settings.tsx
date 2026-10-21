import { useState } from 'react'
import { CalendarPlus, Check, FileJson, FileSpreadsheet } from 'lucide-react'
import { Page, SectionTitle, TopBar } from '../components/ui'
import { useOpenMenu } from '../components/Menu'
import { useStore } from '../data/store'
import { THEMES } from '../content/catalog'
import { backupJSON, expensesCSV } from '../lib/export'
import { download, itineraryICS } from '../lib/ics'

const readTheme = () => {
  try {
    return localStorage.getItem('vg:theme') || 'oceano'
  } catch {
    return 'oceano'
  }
}

export default function Settings() {
  const openMenu = useOpenMenu()
  const { snap, trip, local, deleteTrip, showToast } = useStore()
  const [theme, setTheme] = useState(readTheme)
  const [confirm, setConfirm] = useState('')
  const slug = trip.name.replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase()

  const pick = (id: string) => {
    setTheme(id)
    document.documentElement.dataset.theme = id
    try {
      localStorage.setItem('vg:theme', id)
    } catch {
      /* ok */
    }
    const meta = document.querySelector('meta[name="theme-color"]')
    meta?.setAttribute('content', THEMES.find((t) => t.id === id)!.swatch[0])
  }

  return (
    <>
      <TopBar title="Ajustes" back onMenu={openMenu} />
      <Page>
        <SectionTitle>Tema</SectionTitle>
        <p className="-mt-1 mb-3 text-[13px] text-ink/55">Vale só para este aparelho. Cada um escolhe o seu.</p>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => pick(t.id)}
              aria-pressed={theme === t.id}
              className={`flex items-center gap-3 rounded-2xl p-3 text-left ring-1 transition ${theme === t.id ? 'bg-brand-50 ring-2 ring-brand-400' : 'bg-surface ring-line'}`}
            >
              <span className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl ring-1 ring-black/10" style={{ background: t.swatch[2] }}>
                <span className="absolute left-0 top-0 h-full w-1/2" style={{ background: t.swatch[0] }} />
                <span className="absolute bottom-1 right-1 h-3 w-3 rounded-full" style={{ background: t.swatch[1] }} />
              </span>
              <span className="flex-1 font-bold">{t.label}</span>
              {theme === t.id && <Check size={18} className="text-brand-600" />}
            </button>
          ))}
        </div>

        <SectionTitle>Levar os dados</SectionTitle>
        <div className="space-y-2">
          <button className="btn btn-line w-full !justify-start" onClick={() => download(`${slug}.ics`, itineraryICS(trip.name, snap.trip_items, snap.trip_stops), 'text/calendar')}>
            <CalendarPlus size={18} /> Roteiro para o calendário do celular (.ics)
          </button>
          <button className="btn btn-line w-full !justify-start" onClick={() => download(`${slug}-gastos.csv`, expensesCSV(snap), 'text/csv;charset=utf-8')}>
            <FileSpreadsheet size={18} /> Planilha dos gastos (Excel/CSV)
          </button>
          <button className="btn btn-line w-full !justify-start" onClick={() => download(`${slug}-backup.json`, backupJSON(snap), 'application/json')}>
            <FileJson size={18} /> Cópia de tudo (JSON)
          </button>
        </div>

        <SectionTitle>Sobre</SectionTitle>
        <div className="card text-[14px] text-ink/70">
          {local ? (
            <p>
              <b>Modo de teste:</b> os dados estão só neste navegador. Configure o Supabase (veja o README) para a galera compartilhar.
            </p>
          ) : (
            <p>Tudo fica salvo na nuvem e sincroniza entre os celulares do grupo. Este aparelho guarda uma cópia para abrir sem internet.</p>
          )}
          <p className="mt-2">
            Mapa © OpenStreetMap · Clima Open-Meteo · Câmbio Frankfurter/BCE
          </p>
        </div>

        <SectionTitle>Zona de perigo</SectionTitle>
        <div className="card border border-danger-500/30">
          <p className="font-bold">Apagar a viagem inteira</p>
          <p className="mt-1 text-[13px] text-ink/60">Some para todo mundo: ideias, roteiro, gastos, checklist e enquetes. Não tem volta. Exporte uma cópia antes.</p>
          <label className="mt-3 block text-[13px] font-bold text-ink/70" htmlFor="del-confirm">
            Digite <b>{trip.name}</b> para confirmar
          </label>
          <input id="del-confirm" className="input mt-1" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" />
          <button
            className="btn mt-3 w-full bg-danger-500 text-white hover:bg-danger-600"
            disabled={confirm.trim() !== trip.name.trim()}
            onClick={() => deleteTrip().catch(() => showToast('Não consegui apagar. Tente de novo.'))}
          >
            Apagar viagem
          </button>
        </div>
      </Page>
    </>
  )
}
