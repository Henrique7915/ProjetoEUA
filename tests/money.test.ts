import { describe, expect, it } from 'vitest'
import { balances, convert, expenseShares, forecast, parseAmount, settle } from '../src/lib/money'
import type { Expense, Item, Member } from '../src/data/types'

const member = (id: string): Member => ({ id, trip_id: 't', name: id, color: '#000000', emoji: '', created_at: '' })
const A = member('ana')
const B = member('bia')
const C = member('caio')
const D = member('duda')
const people = [A, B, C, D]

function exp(p: Partial<Expense>): Expense {
  return {
    id: Math.random().toString(),
    trip_id: 't',
    kind: 'gasto',
    title: 'x',
    amount: 0,
    currency: 'BRL',
    rate: 1,
    paid_by: A.id,
    split_among: people.map((m) => m.id),
    shares: null,
    category: 'outros',
    spent_on: '2027-07-01',
    item_id: null,
    note: '',
    created_by: null,
    created_at: '',
    ...p
  }
}

describe('dinheiro', () => {
  it('lê valores em formato brasileiro e americano', () => {
    expect(parseAmount('1.234,56')).toBe(1234.56)
    expect(parseAmount('12,5')).toBe(12.5)
    expect(parseAmount('99.90')).toBe(99.9)
    expect(parseAmount('R$ 10')).toBe(10)
    expect(parseAmount('')).toBeNull()
  })

  it('divide igual sem perder centavos', () => {
    const s = expenseShares(exp({ amount: 10, split_among: [A.id, B.id, C.id] }))
    expect([...s.values()]).toEqual([334, 333, 333])
  })

  it('divisão com valores diferentes, convertendo a moeda', () => {
    const s = expenseShares(exp({ amount: 30, currency: 'USD', rate: 5, shares: { [A.id]: 10, [B.id]: 20 } }))
    expect(s.get(A.id)).toBe(5000)
    expect(s.get(B.id)).toBe(10000)
  })

  it('saldo e acerto mínimo', () => {
    const list = [
      exp({ amount: 400, paid_by: A.id }), // cada um consome 100
      exp({ amount: 100, paid_by: B.id, split_among: [B.id, C.id] }) // B e C consomem 50
    ]
    const b = balances(list, people)
    const net = Object.fromEntries(b.map((x) => [x.member, x.net / 100]))
    expect(net).toEqual({ ana: 300, bia: -50, caio: -150, duda: -100 })
    const t = settle(b)
    expect(t.reduce((s, x) => s + x.amount, 0)).toBe(30000)
    expect(t.every((x) => x.to === A.id)).toBe(true)
  })

  it('acerto registrado zera a dívida e não conta como gasto', () => {
    const list = [exp({ amount: 100, paid_by: A.id, split_among: [A.id, B.id] }), exp({ kind: 'acerto', amount: 50, paid_by: B.id, split_among: [A.id] })]
    const b = balances(list, [A, B])
    expect(b.every((x) => x.net === 0)).toBe(true)
    expect(b.find((x) => x.member === A.id)!.paid).toBe(10000)
    expect(b.find((x) => x.member === B.id)!.share).toBe(5000)
    expect(settle(b)).toEqual([])
  })

  it('converte entre moedas via real', () => {
    const rates = { BRL: 1, USD: 5, CAD: 4, EUR: 6 }
    expect(convert(10, 'USD', 'BRL', rates)).toBe(50)
    expect(convert(10, 'USD', 'CAD', rates)).toBe(12.5)
  })

  it('previsão soma só aprovados/reservados com preço', () => {
    const rates = { BRL: 1, USD: 5, CAD: 4, EUR: 6 }
    const item = (p: Partial<Item>) => ({ price: null, currency: 'USD', price_per: 'total', status: 'aprovado', category: 'passeio', ...p }) as Item
    const f = forecast(
      [
        item({ price: 400, category: 'hospedagem' }),
        item({ price: 100, price_per: 'pessoa', category: 'parque' }),
        item({ price: 999, status: 'ideia' }),
        item({ price: null })
      ],
      4,
      rates
    )
    expect(f.total).toBe(400 * 5 + 100 * 4 * 5)
    expect(f.perPerson).toBe(1000)
  })
})
