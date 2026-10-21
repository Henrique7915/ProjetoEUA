import {
  BedDouble,
  Camera,
  Car,
  FerrisWheel,
  FileText,
  Lightbulb,
  Plane,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Ticket,
  UtensilsCrossed,
  Wallet,
  type LucideIcon
} from 'lucide-react'
import type { ItemCategory, ItemStatus, Task } from '../data/types'

export interface CategoryInfo {
  id: ItemCategory
  label: string
  plural: string
  icon: LucideIcon
  /** cor do marcador no mapa */
  hex: string
  /** classes de fundo/texto do ícone */
  tone: string
}

export const CATEGORIES: CategoryInfo[] = [
  { id: 'hospedagem', label: 'Hospedagem', plural: 'Hospedagem', icon: BedDouble, hex: '#8B63D0', tone: 'bg-lilac-500/15 text-lilac-600' },
  { id: 'voo', label: 'Voo', plural: 'Voos', icon: Plane, hex: '#2F8FD6', tone: 'bg-sky-500/15 text-sky-600' },
  { id: 'transporte', label: 'Transporte', plural: 'Transporte', icon: Car, hex: '#64748B', tone: 'bg-ink/10 text-ink/70' },
  { id: 'passeio', label: 'Passeio', plural: 'Passeios', icon: Camera, hex: '#1F9E7A', tone: 'bg-mint-500/15 text-mint-600' },
  { id: 'parque', label: 'Parque', plural: 'Parques', icon: FerrisWheel, hex: '#E0558A', tone: 'bg-rosy-500/15 text-rosy-600' },
  { id: 'comida', label: 'Comida', plural: 'Comida', icon: UtensilsCrossed, hex: '#F2643F', tone: 'bg-accent-500/15 text-accent-600' },
  { id: 'compras', label: 'Compras', plural: 'Compras', icon: ShoppingBag, hex: '#F2B53A', tone: 'bg-sun-400/20 text-sun-600' },
  { id: 'documento', label: 'Documento', plural: 'Documentos', icon: FileText, hex: '#1A7FB0', tone: 'bg-brand-500/15 text-brand-600' },
  { id: 'dica', label: 'Dica', plural: 'Dicas', icon: Lightbulb, hex: '#A8770F', tone: 'bg-sun-400/20 text-sun-600' },
  { id: 'outro', label: 'Outro', plural: 'Outros', icon: Sparkles, hex: '#94A3B8', tone: 'bg-shell text-ink/60' }
]

export const CATEGORY: Record<ItemCategory, CategoryInfo> = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<ItemCategory, CategoryInfo>

export const STATUSES: { id: ItemStatus; label: string; tone: string }[] = [
  { id: 'ideia', label: 'Ideia', tone: 'bg-shell text-ink/70' },
  { id: 'aprovado', label: 'Aprovado', tone: 'bg-mint-500/15 text-mint-600' },
  { id: 'reservado', label: 'Reservado', tone: 'bg-brand-500/15 text-brand-700' },
  { id: 'descartado', label: 'Descartado', tone: 'bg-danger-500/10 text-danger-600' }
]

export const STATUS = Object.fromEntries(STATUSES.map((s) => [s.id, s])) as Record<ItemStatus, (typeof STATUSES)[number]>

export const EXPENSE_CATEGORIES: { id: string; label: string; icon: LucideIcon; hex: string }[] = [
  { id: 'comida', label: 'Comida', icon: UtensilsCrossed, hex: '#F2643F' },
  { id: 'hospedagem', label: 'Hospedagem', icon: BedDouble, hex: '#8B63D0' },
  { id: 'transporte', label: 'Transporte', icon: Car, hex: '#64748B' },
  { id: 'voo', label: 'Passagens', icon: Plane, hex: '#2F8FD6' },
  { id: 'ingressos', label: 'Ingressos', icon: Ticket, hex: '#E0558A' },
  { id: 'mercado', label: 'Mercado', icon: ShoppingCart, hex: '#1F9E7A' },
  { id: 'compras', label: 'Compras', icon: ShoppingBag, hex: '#F2B53A' },
  { id: 'outros', label: 'Outros', icon: Wallet, hex: '#94A3B8' }
]

export const EXPENSE_CATEGORY = Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c.id, c]))

/** Cores das pessoas, na ordem em que entram. */
export const MEMBER_COLORS = ['#1A7FB0', '#F2643F', '#1F9E7A', '#8B63D0', '#E0558A', '#E3A21A', '#2F8FD6', '#C42E36', '#4B5563', '#0E9AA7']

export const TRIP_EMOJIS = ['✈️', '🌴', '🎢', '🍁', '🗽', '🏖️', '🚗', '🧳', '🌎', '🎡']

export interface Destination {
  city: string
  country: 'US' | 'CA'
  lat: number
  lng: number
}

export const DESTINATIONS: Destination[] = [
  { city: 'Orlando', country: 'US', lat: 28.5384, lng: -81.3789 },
  { city: 'Miami', country: 'US', lat: 25.7617, lng: -80.1918 },
  { city: 'Tampa', country: 'US', lat: 27.9506, lng: -82.4572 },
  { city: 'Fort Lauderdale', country: 'US', lat: 26.1224, lng: -80.1373 },
  { city: 'Key West', country: 'US', lat: 24.5551, lng: -81.78 },
  { city: 'Cabo Canaveral', country: 'US', lat: 28.3922, lng: -80.6077 },
  { city: 'Nova York', country: 'US', lat: 40.7128, lng: -74.006 },
  { city: 'Toronto', country: 'CA', lat: 43.6532, lng: -79.3832 },
  { city: 'Niagara Falls', country: 'CA', lat: 43.0896, lng: -79.0849 },
  { city: 'Montreal', country: 'CA', lat: 45.5019, lng: -73.5674 },
  { city: 'Quebec', country: 'CA', lat: 46.8139, lng: -71.208 },
  { city: 'Ottawa', country: 'CA', lat: 45.4215, lng: -75.6972 },
  { city: 'Vancouver', country: 'CA', lat: 49.2827, lng: -123.1207 }
]

export const COUNTRY_FLAG: Record<string, string> = { US: '🇺🇸', CA: '🇨🇦', BR: '🇧🇷', MX: '🇲🇽' }

export const TASK_SECTIONS = ['Documentos', 'Reservas', 'Saúde', 'Dinheiro', 'Tecnologia', 'Bagagem', 'Outros']

type TaskTemplate = Pick<Task, 'title' | 'section' | 'scope' | 'note'>

/** Checklist que já vem pronta numa viagem nova (dá para apagar ou mudar tudo). */
export const CHECKLIST_TEMPLATE: TaskTemplate[] = [
  { section: 'Documentos', scope: 'cada', title: 'Passaporte válido', note: 'Recomendado ter pelo menos 6 meses de validade além da volta.' },
  { section: 'Documentos', scope: 'cada', title: 'Visto americano (B1/B2)', note: 'Comece cedo: formulário DS-160, taxa, CASV e entrevista no consulado. Veja o Guia.' },
  { section: 'Documentos', scope: 'cada', title: 'eTA do Canadá', note: 'Só depois do visto americano aprovado, e só vale chegando de avião. Use apenas o site oficial canada.ca.' },
  { section: 'Documentos', scope: 'cada', title: 'CNH + Permissão Internacional (PID), se for dirigir', note: '' },
  { section: 'Documentos', scope: 'cada', title: 'Cópia digital dos documentos no celular e na nuvem', note: '' },
  { section: 'Reservas', scope: 'grupo', title: 'Passagens Brasil → Flórida', note: '' },
  { section: 'Reservas', scope: 'grupo', title: 'Voo Flórida → Canadá', note: 'De avião, para o eTA valer.' },
  { section: 'Reservas', scope: 'grupo', title: 'Voo de volta para o Brasil', note: '' },
  { section: 'Reservas', scope: 'grupo', title: 'Hospedagem em Orlando', note: '' },
  { section: 'Reservas', scope: 'grupo', title: 'Hospedagem em Miami', note: '' },
  { section: 'Reservas', scope: 'grupo', title: 'Hospedagem no Canadá', note: '' },
  { section: 'Reservas', scope: 'grupo', title: 'Aluguel de carro', note: 'Confira seguro, pedágio (SunPass) e motorista adicional.' },
  { section: 'Reservas', scope: 'grupo', title: 'Ingressos dos parques', note: '' },
  { section: 'Saúde', scope: 'cada', title: 'Seguro viagem cobrindo EUA e Canadá', note: '' },
  { section: 'Saúde', scope: 'cada', title: 'Remédios de uso contínuo + receita', note: '' },
  { section: 'Dinheiro', scope: 'cada', title: 'Cartão internacional ou conta global', note: '' },
  { section: 'Dinheiro', scope: 'cada', title: 'Avisar o banco sobre a viagem', note: '' },
  { section: 'Dinheiro', scope: 'cada', title: 'Um pouco de dólar em espécie', note: 'Para gorjeta e imprevistos.' },
  { section: 'Tecnologia', scope: 'cada', title: 'eSIM ou chip para EUA + Canadá', note: '' },
  { section: 'Tecnologia', scope: 'cada', title: 'Adaptador de tomada (tipo A/B)', note: '' },
  { section: 'Tecnologia', scope: 'cada', title: 'Baixar mapas offline', note: '' },
  { section: 'Bagagem', scope: 'grupo', title: 'Conferir as regras de bagagem das companhias', note: '' }
]

export interface ThemeInfo {
  id: string
  label: string
  swatch: [string, string, string]
}

export const THEMES: ThemeInfo[] = [
  { id: 'oceano', label: 'Oceano', swatch: ['#1A7FB0', '#F2643F', '#F5FAFC'] },
  { id: 'por-do-sol', label: 'Pôr do sol', swatch: ['#E2582C', '#7B5CD6', '#FFF9F5'] },
  { id: 'bordo', label: 'Bordo', swatch: ['#C42E36', '#1F9676', '#FCF8F6'] },
  { id: 'floresta', label: 'Floresta', swatch: ['#26844C', '#E28C1E', '#F6FAF6'] },
  { id: 'noite', label: 'Noite', swatch: ['#6FBCE6', '#FF8A6B', '#0D1821'] }
]
