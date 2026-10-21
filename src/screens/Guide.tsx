import { Link, useParams } from 'react-router-dom'
import { ChevronRight, ExternalLink } from 'lucide-react'
import { Page, TopBar } from '../components/ui'
import { useOpenMenu } from '../components/Menu'
import { GUIDE, GUIDE_BY_SLUG } from '../content/guide'

const GROUPS = ['Antes de ir', 'Dinheiro', 'Lá', 'Volta'] as const

export function GuideList() {
  const openMenu = useOpenMenu()
  return (
    <>
      <TopBar title="Guia da viagem" back onMenu={openMenu} />
      <Page>
        <p className="text-[15px] text-ink/65">O essencial para brasileiros indo para a Flórida e o Canadá. Regras e valores mudam: confira sempre no site oficial antes de pagar ou agendar.</p>
        {GROUPS.map((g) => (
          <section key={g} className="mt-6">
            <h2 className="h-section mb-3">{g}</h2>
            <ul className="space-y-2.5">
              {GUIDE.filter((a) => a.group === g).map((a) => (
                <li key={a.slug}>
                  <Link to={`/guia/${a.slug}`} className="card flex items-center gap-3 !p-4">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-2xl">{a.emoji}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-extrabold">{a.title}</span>
                      <span className="line-clamp-2 block text-[13px] text-ink/60">{a.summary}</span>
                    </span>
                    <ChevronRight className="shrink-0 text-ink/35" size={20} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </Page>
    </>
  )
}

export function Article() {
  const { slug } = useParams()
  const a = slug ? GUIDE_BY_SLUG[slug] : undefined
  if (!a)
    return (
      <>
        <TopBar title="Guia" back="/guia" />
        <Page>
          <p className="mt-10 text-center font-bold">Texto não encontrado.</p>
        </Page>
      </>
    )
  return (
    <>
      <TopBar title={a.group} back="/guia" />
      <Page>
        <p className="text-5xl">{a.emoji}</p>
        <h1 className="h-title mt-3">{a.title}</h1>
        <p className="mt-2 text-[16px] font-semibold text-ink/65">{a.summary}</p>
        <div className="mt-6 space-y-5">
          {a.blocks.map((b, i) => (
            <section key={i}>
              {b.h && <h2 className="h-section mb-2">{b.h}</h2>}
              {b.p && <p className="text-[16px] leading-relaxed text-ink/80">{b.p}</p>}
              {b.list && (
                <ul className="space-y-2.5">
                  {b.list.map((li, j) => (
                    <li key={j} className="flex gap-2.5 text-[15.5px] leading-relaxed text-ink/80">
                      <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                      <span>{li}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
        {a.links.length > 0 && (
          <section className="mt-8">
            <h2 className="h-section mb-3">Sites oficiais</h2>
            <ul className="space-y-2">
              {a.links.map((l) => (
                <li key={l.url}>
                  <a href={l.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-2xl bg-surface p-3.5 font-bold text-brand-700 ring-1 ring-line hover:bg-brand-50">
                    <ExternalLink size={18} className="shrink-0" /> {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
        <p className="mt-8 rounded-2xl bg-shell p-3 text-[12.5px] font-semibold text-ink/55">Texto de orientação geral, sem valor oficial. Confira as regras atuais nos sites do governo antes de viajar.</p>
      </Page>
    </>
  )
}
