import { StrictMode, useCallback, useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, useLocation, useNavigate } from 'react-router-dom'
import App from './App'
import Entry from './screens/Entry'
import { Spinner } from './components/ui'
import { StoreProvider } from './data/store'
import { gateway as makeGateway, normalizeCode } from './data/backend'
import { forgetTrip, loadSession, rememberTrip, saveSession, type Session } from './data/session'
import type { Trip } from './data/types'
import './index.css'

function Root() {
  const gateway = useMemo(makeGateway, [])
  const location = useLocation()
  const navigate = useNavigate()
  const linkCode = location.pathname.match(/^\/entrar\/([A-Za-z0-9-]+)/)?.[1]
  const [session, setSession] = useState<Session | null>(() => {
    const s = loadSession()
    // Link de convite de outra viagem: troca para ela.
    if (linkCode && s && s.code !== normalizeCode(linkCode)) return null
    return s
  })

  useEffect(() => {
    if (linkCode && session?.code === normalizeCode(linkCode)) navigate('/', { replace: true })
  }, [linkCode, session, navigate])

  const enter = useCallback(
    (s: Session) => {
      saveSession(s)
      setSession(s)
      navigate('/', { replace: true })
    },
    [navigate]
  )

  const pickMember = useCallback((id: string | null) => {
    setSession((s) => {
      if (!s) return s
      const next = { ...s, memberId: id }
      saveSession(next)
      return next
    })
  }, [])

  const leave = useCallback(() => {
    saveSession(null)
    setSession(null)
    navigate('/', { replace: true })
  }, [navigate])

  const tripLoaded = useCallback((trip: Trip) => rememberTrip({ code: trip.code, name: trip.name, emoji: trip.emoji }), [])

  const backend = useMemo(() => (session ? gateway.open(session.code) : null), [gateway, session?.code])

  if (!session || !backend) return <Entry gateway={gateway} initialCode={linkCode} onEnter={enter} />

  return (
    <StoreProvider
      key={session.code}
      backend={backend}
      code={session.code}
      memberId={session.memberId}
      local={gateway.local}
      onPickMember={pickMember}
      onLeave={leave}
      onTripLoaded={tripLoaded}
      fallback={<Spinner />}
      onError={(message) => (
        <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 text-center">
          <p className="text-4xl">🧭</p>
          <p className="mt-4 text-xl font-extrabold">{message}</p>
          <button
            className="btn btn-primary mx-auto mt-6"
            onClick={() => {
              if (/não existe/.test(message)) forgetTrip(session.code)
              leave()
            }}
          >
            Voltar
          </button>
        </main>
      )}
    >
      <App />
    </StoreProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Root />
    </BrowserRouter>
  </StrictMode>
)
