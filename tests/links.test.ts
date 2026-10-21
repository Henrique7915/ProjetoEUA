import { describe, expect, it } from 'vitest'
import { extractUrl, guessCategory, siteName } from '../src/lib/links'
import { coordsFromUrl } from '../src/lib/geo'
import { itineraryICS } from '../src/lib/ics'
import { dateRange } from '../src/lib/dates'
import type { Item } from '../src/data/types'

describe('links', () => {
  it('acha o link dentro de uma mensagem', () => {
    expect(extractUrl('olha esse hotel https://www.airbnb.com.br/rooms/123?x=1 top!')).toBe('https://www.airbnb.com.br/rooms/123?x=1')
    expect(extractUrl('booking.com/hotel/us/x.html')).toBe('https://booking.com/hotel/us/x.html')
    expect(extractUrl('jantar no outback')).toBeNull()
  })

  it('dá nome ao site e chuta a categoria', () => {
    expect(siteName('https://www.airbnb.com.br/rooms/1')).toBe('Airbnb')
    expect(siteName('https://www.cheesecakefactory.com/menu')).toBe('Cheesecakefactory')
    expect(guessCategory('https://www.booking.com/hotel/us/x.html')).toBe('hospedagem')
    expect(guessCategory('https://disneyworld.disney.go.com/parks/magic-kingdom/')).toBe('parque')
    expect(guessCategory('https://www.latamairlines.com/br/pt')).toBe('voo')
    expect(guessCategory('https://www.premiumoutlets.com/outlet/orlando-international')).toBe('compras')
    expect(guessCategory('https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/eta.html')).toBe('documento')
  })

  it('lê coordenadas de links do Google Maps', () => {
    expect(coordsFromUrl('https://www.google.com/maps/place/Magic+Kingdom/@28.4177,-81.5812,17z/data=!3d28.417663!4d-81.581212')).toEqual({ lat: 28.417663, lng: -81.581212 })
    expect(coordsFromUrl('https://maps.google.com/?q=43.6426,-79.3871')).toEqual({ lat: 43.6426, lng: -79.3871 })
    expect(coordsFromUrl('https://example.com')).toBeNull()
  })
})

describe('roteiro', () => {
  it('gera .ics com evento de horário e de vários dias', () => {
    const base = { status: 'aprovado', url: '', note: '', confirmation: '', address: '', end_day: null, start_time: null } as unknown as Item
    const ics = itineraryICS(
      'Flórida',
      [
        { ...base, id: '1', title: 'Magic Kingdom', day: '2027-07-02', start_time: '08:30:00' },
        { ...base, id: '2', title: 'Hotel', day: '2027-07-01', end_day: '2027-07-05', confirmation: 'ABC123' }
      ] as Item[],
      []
    )
    expect(ics).toContain('DTSTART:20270702T083000')
    expect(ics).toContain('DTEND:20270702T100000')
    expect(ics).toContain('DTSTART;VALUE=DATE:20270701')
    expect(ics).toContain('DTEND;VALUE=DATE:20270706')
    expect(ics).toContain('Confirmação: ABC123')
  })

  it('escreve o período da viagem', () => {
    expect(dateRange('2027-07-01', '2027-07-20')).toBe('1 a 20 de jul. de 2027')
    expect(dateRange('2027-06-28', '2027-07-05')).toBe('28 de jun. a 5 de jul. de 2027')
    expect(dateRange(null, null)).toBe('Datas a definir')
  })
})
