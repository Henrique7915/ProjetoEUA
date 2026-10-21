// Aplica a migração num Postgres em memória (PGlite) e confere as regras de acesso por código de viagem.
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { beforeAll, describe, expect, it } from 'vitest'

const root = join(__dirname, '..', 'supabase')
let db: PGlite
let A: { code: string; trip_id: string; member_id: string }
let B: { code: string; trip_id: string; member_id: string }

/** Roda como o app roda: papel anon e o código no cabeçalho (ou sem código). */
async function as<T>(code: string | null, fn: () => Promise<T>): Promise<T> {
  const headers = JSON.stringify(code ? { 'x-trip-code': code } : {})
  await db.exec(`set role anon; select set_config('request.headers', '${headers}', false);`)
  try {
    return await fn()
  } finally {
    await db.exec(`reset role; select set_config('request.headers', '', false);`)
  }
}

const create = (name: string, member: string) =>
  as(null, async () => (await db.query<{ r: typeof A }>(`select trip_create($1, $2, '2027-07-01', '2027-07-20') as r`, [name, member])).rows[0].r)

beforeAll(async () => {
  db = new PGlite()
  await db.exec(readFileSync(join(root, 'tests', 'auth-stub.sql'), 'utf8'))
  for (const f of readdirSync(join(root, 'migrations')).sort()) await db.exec(readFileSync(join(root, 'migrations', f), 'utf8'))
  A = await create('Flórida + Canadá', 'Henrique')
  B = await create('Outra viagem', 'Zé')
})

describe('banco', () => {
  it('cria viagem com código de 12 caracteres e a primeira pessoa', () => {
    expect(A.code).toMatch(/^[A-HJ-NP-Z2-9]{12}$/)
    expect(A.code).not.toBe(B.code)
    expect(A.member_id).toBeTruthy()
  })

  it('com o código, lê a própria viagem; o trip_id entra sozinho', async () => {
    const trips = await as(A.code, () => db.query<{ name: string }>('select name from trips'))
    expect(trips.rows).toEqual([{ name: 'Flórida + Canadá' }])
    await as(A.code, () => db.exec(`insert into trip_members (name) values ('Ana')`))
    await as(A.code, () => db.exec(`insert into trip_items (title, category, url) values ('Hotel em Orlando', 'hospedagem', 'https://x.com')`))
    const members = await as(A.code, () => db.query<{ name: string }>('select name from trip_members order by name'))
    expect(members.rows.map((r) => r.name)).toEqual(['Ana', 'Henrique'])
  })

  it('código minúsculo também vale', async () => {
    const trips = await as(A.code.toLowerCase(), () => db.query('select id from trips'))
    expect(trips.rows).toHaveLength(1)
  })

  it('não enxerga nem mexe na viagem dos outros', async () => {
    expect((await as(B.code, () => db.query('select * from trip_items'))).rows).toHaveLength(0)
    expect((await as(B.code, () => db.query('select * from trip_members'))).rows).toHaveLength(1)
    await as(B.code, () => db.exec(`update trip_items set title = 'hackeado'`))
    await as(B.code, () => db.exec(`delete from trip_members where trip_id = '${A.trip_id}'`))
    const item = await db.query<{ title: string }>(`select title from trip_items where trip_id = '${A.trip_id}'`)
    expect(item.rows[0].title).toBe('Hotel em Orlando')
    expect((await db.query(`select * from trip_members where trip_id = '${A.trip_id}'`)).rows).toHaveLength(2)
    await expect(as(B.code, () => db.exec(`insert into trip_items (trip_id, title) values ('${A.trip_id}', 'invasão')`))).rejects.toThrow()
  })

  it('sem código ou com código errado não vê nada', async () => {
    expect((await as(null, () => db.query('select * from trips'))).rows).toHaveLength(0)
    expect((await as('ERRADOERRADO', () => db.query('select * from trip_items'))).rows).toHaveLength(0)
    await expect(as(null, () => db.exec(`insert into trip_members (name) values ('X')`))).rejects.toThrow()
    await expect(as(null, () => db.exec(`insert into trips (code, name) values ('ABCDEFGHJKLM', 'x')`))).rejects.toThrow()
  })

  it('nome repetido na mesma viagem é recusado, em outra viagem pode', async () => {
    await expect(as(A.code, () => db.exec(`insert into trip_members (name) values (' ana ')`))).rejects.toThrow()
    await as(B.code, () => db.exec(`insert into trip_members (name) values ('Ana')`))
  })

  it('o código não muda', async () => {
    await expect(as(A.code, () => db.exec(`update trips set code = 'ZZZZZZZZZZZZ'`))).rejects.toThrow()
    await as(A.code, () => db.exec(`update trips set name = 'EUA + Canadá 2027'`))
    const t = await as(A.code, () => db.query<{ name: string }>('select name from trips'))
    expect(t.rows[0].name).toBe('EUA + Canadá 2027')
  })

  it('voto único por pessoa e gasto com quem pagou protegido', async () => {
    const item = (await as(A.code, () => db.query<{ id: string }>('select id from trip_items'))).rows[0].id
    await as(A.code, () => db.exec(`insert into trip_votes (item_id, member_id, value) values ('${item}', '${A.member_id}', 1)`))
    await expect(as(A.code, () => db.exec(`insert into trip_votes (item_id, member_id, value) values ('${item}', '${A.member_id}', -1)`))).rejects.toThrow()
    await as(A.code, () =>
      db.exec(`insert into trip_expenses (title, amount, currency, rate, paid_by, split_among) values ('Uber', 30, 'USD', 5.4, '${A.member_id}', array['${A.member_id}']::uuid[])`)
    )
    await expect(as(A.code, () => db.exec(`delete from trip_members where id = '${A.member_id}'`))).rejects.toThrow()
    await expect(as(A.code, () => db.exec(`insert into trip_expenses (title, amount, paid_by, split_among) values ('x', -1, '${A.member_id}', array['${A.member_id}']::uuid[])`))).rejects.toThrow()
  })

  it('apagar a viagem leva tudo junto', async () => {
    await as(B.code, () => db.exec('delete from trips'))
    expect((await db.query(`select * from trip_members where trip_id = '${B.trip_id}'`)).rows).toHaveLength(0)
  })
})
