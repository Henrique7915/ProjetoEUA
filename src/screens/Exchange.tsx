import { useState } from 'react'
import { ArrowUpDown, RefreshCw } from 'lucide-react'
import { Page, SectionTitle, TopBar } from '../components/ui'
import { useOpenMenu } from '../components/Menu'
import { useRates } from '../data/derived'
import type { Currency } from '../data/types'
import { convert, CURRENCIES, money, parseAmount } from '../lib/money'
import { fullDate } from '../lib/dates'

const FEE_KEY = 'vg:fee'

function readFee(): string {
  try {
    return localStorage.getItem(FEE_KEY) ?? ''
  } catch {
    return ''
  }
}

export default function Exchange() {
  const openMenu = useOpenMenu()
  const rates = useRates()
  const [amount, setAmount] = useState('100')
  const [from, setFrom] = useState<Currency>('USD')
  const [to, setTo] = useState<Currency>('BRL')
  const [fee, setFee] = useState(readFee)

  const value = parseAmount(amount) ?? 0
  const feePct = parseAmount(fee) ?? 0
  const base = convert(value, from, to, rates.rates)
  // A taxa (IOF + spread) incide quando se paga em moeda estrangeira com dinheiro em reais.
  const withFee = to === 'BRL' && from !== 'BRL' ? base * (1 + feePct / 100) : base

  const saveFee = (v: string) => {
    setFee(v)
    try {
      localStorage.setItem(FEE_KEY, v)
    } catch {
      /* ok */
    }
  }

  return (
    <>
      <TopBar title="Câmbio" back onMenu={openMenu} />
      <Page>
        <section className="card">
          <label className="label" htmlFor="fx-amount">
            Valor
          </label>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <input id="fx-amount" className="input text-2xl font-extrabold tabular-nums" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <Select value={from} onChange={setFrom} label="De" />
          </div>
          <div className="my-3 flex justify-center">
            <button
              className="icon-btn bg-brand-50"
              onClick={() => {
                setFrom(to)
                setTo(from)
              }}
              aria-label="Inverter moedas"
            >
              <ArrowUpDown size={20} />
            </button>
          </div>
          <div className="grid grid-cols-[1fr_auto] items-center gap-2">
            <p className="rounded-2xl bg-brand-50 px-4 py-3 text-2xl font-extrabold tabular-nums text-brand-700" aria-live="polite">
              {money(withFee, to)}
            </p>
            <Select value={to} onChange={setTo} label="Para" />
          </div>
          {feePct > 0 && to === 'BRL' && from !== 'BRL' && <p className="mt-2 text-[13px] font-semibold text-ink/55">Sem taxas: {money(base, to)}</p>}
          <div className="mt-4 flex items-center gap-2 text-[13px] font-semibold text-ink/60">
            <label htmlFor="fx-fee">IOF + spread do seu cartão</label>
            <input id="fx-fee" className="input !w-20 !py-1.5 text-right text-sm" inputMode="decimal" placeholder="0" value={fee} onChange={(e) => saveFee(e.target.value)} />
            <span>%</span>
          </div>
        </section>

        <SectionTitle
          action={
            <button onClick={rates.refresh} className="inline-flex items-center gap-1 text-sm font-bold text-brand-600">
              <RefreshCw size={15} /> Atualizar
            </button>
          }
        >
          Cotação {rates.live ? 'do dia' : '(aproximada)'}
        </SectionTitle>
        <div className="grid grid-cols-3 gap-2.5">
          {(['USD', 'CAD', 'EUR'] as Currency[]).map((c) => (
            <div key={c} className="rounded-2xl bg-surface p-3.5 ring-1 ring-line/80">
              <p className="text-[13px] font-bold text-ink/55">
                {CURRENCIES.find((x) => x.id === c)!.flag} 1 {c}
              </p>
              <p className="mt-1 text-lg font-extrabold tabular-nums">{money(rates.rates[c])}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[12px] font-semibold text-ink/45">
          {rates.live ? `Cotação comercial de ${rates.date ? fullDate(rates.date) : 'hoje'} (Banco Central Europeu). O cartão e as casas de câmbio cobram um pouco mais.` : 'Sem internet: valores aproximados.'}
        </p>

        <SectionTitle>Tabela rápida</SectionTitle>
        <div className="card !p-0">
          <table className="w-full text-[15px] tabular-nums">
            <thead>
              <tr className="text-left text-[12px] uppercase tracking-wide text-ink/45">
                <th className="px-4 py-2.5">Valor</th>
                <th className="px-4 py-2.5 text-right">🇺🇸 USD → R$</th>
                <th className="px-4 py-2.5 text-right">🇨🇦 CAD → R$</th>
              </tr>
            </thead>
            <tbody>
              {[1, 5, 10, 20, 50, 100, 200, 500].map((v) => (
                <tr key={v} className="border-t border-line/60">
                  <td className="px-4 py-2 font-bold">{v}</td>
                  <td className="px-4 py-2 text-right font-semibold">{money(v * rates.rates.USD * (1 + feePct / 100))}</td>
                  <td className="px-4 py-2 text-right font-semibold">{money(v * rates.rates.CAD * (1 + feePct / 100))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Page>
    </>
  )
}

function Select({ value, onChange, label }: { value: Currency; onChange: (c: Currency) => void; label: string }) {
  return (
    <select className="input !w-auto" value={value} onChange={(e) => onChange(e.target.value as Currency)} aria-label={label}>
      {CURRENCIES.map((c) => (
        <option key={c.id} value={c.id}>
          {c.flag} {c.id}
        </option>
      ))}
    </select>
  )
}
