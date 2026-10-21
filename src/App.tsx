import { lazy, Suspense, useEffect } from 'react'
import { Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { BottomNav } from './components/BottomNav'
import { MenuProvider } from './components/Menu'
import { Spinner, Toast } from './components/ui'
import { useRawStore } from './data/store'
import WhoAmI from './screens/WhoAmI'
import Home from './screens/Home'
import Ideas from './screens/Ideas'
import ItemDetail from './screens/ItemDetail'
import Itinerary from './screens/Itinerary'
import Expenses from './screens/Expenses'
import Checklist from './screens/Checklist'
import Polls from './screens/Polls'
import Exchange from './screens/Exchange'
import { Article, GuideList } from './screens/Guide'
import Group from './screens/Group'
import Settings from './screens/Settings'

// O mapa (Leaflet) só carrega quando alguém abre.
const MapScreen = lazy(() => import('./screens/MapScreen'))

function Shell() {
  return (
    <>
      <Outlet />
      <BottomNav />
    </>
  )
}

function ScrollTop() {
  const { pathname } = useLocation()
  useEffect(() => window.scrollTo(0, 0), [pathname])
  return null
}

function Offline() {
  const { stale } = useRawStore()
  if (!stale) return null
  return <div className="no-print sticky top-0 z-40 bg-sun-400 px-4 py-1.5 text-center text-[13px] font-bold text-ink">Sem conexão: mostrando o que estava salvo neste aparelho</div>
}

export default function App() {
  const { me, toast } = useRawStore()
  if (!me) return <WhoAmI />
  return (
    <MenuProvider>
      <ScrollTop />
      <Offline />
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<Home />} />
          <Route path="ideias" element={<Ideas />} />
          <Route path="ideias/nova" element={<Ideas />} />
          <Route path="roteiro" element={<Itinerary />} />
          <Route path="gastos" element={<Expenses />} />
          <Route path="checklist" element={<Checklist />} />
          <Route path="enquetes" element={<Polls />} />
          <Route path="cambio" element={<Exchange />} />
          <Route path="guia" element={<GuideList />} />
          <Route path="guia/:slug" element={<Article />} />
          <Route path="grupo" element={<Group />} />
          <Route path="ajustes" element={<Settings />} />
          <Route
            path="mapa"
            element={
              <Suspense fallback={<Spinner label="Abrindo o mapa" />}>
                <MapScreen />
              </Suspense>
            }
          />
          <Route path="*" element={<Home />} />
        </Route>
        <Route path="ideias/:id" element={<ItemDetail />} />
      </Routes>
      <Toast message={toast} />
    </MenuProvider>
  )
}
