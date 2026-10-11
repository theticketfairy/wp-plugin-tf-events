import { describe, expect, it, vi } from 'vitest'
import {
  BrandNotFoundError,
  describeEvent,
  embedAttributes,
  embedPlaceholderHtml,
  fetchBrandEvents,
  isWidgetKey,
  parseTicketFairyLink,
} from './index'

describe('parseTicketFairyLink', () => {
  it.each([
    'https://www.ticketfairy.com/event/anyma-tulum-2027',
    'http://ticketfairy.com/event/anyma-tulum-2027/',
    'www.ticketfairy.com/event/anyma-tulum-2027?r=abc#tickets',
    'ticketfairy.com/event/anyma-tulum-2027',
    '  https://www.theticketfairy.com/event/anyma-tulum-2027  ',
  ])('reads an event link: %s', (link) => {
    expect(parseTicketFairyLink(link)).toEqual({ kind: 'event', eventSlug: 'anyma-tulum-2027' })
  })

  it('reads a brand page link', () => {
    expect(parseTicketFairyLink('https://www.ticketfairy.com/events/zamna-festival')).toEqual({
      kind: 'brand',
      brandSlug: 'zamna-festival',
    })
  })

  it.each([
    ['', 'empty'],
    ['   ', 'empty'],
    ['https://example.com/event/anyma', 'not-ticket-fairy'],
    ['https://ticketfairy.com.evil.example/event/anyma', 'not-ticket-fairy'],
    ['https://www.ticketfairy.com/', 'unrecognised'],
    ['https://www.ticketfairy.com/event/', 'unrecognised'],
    ['https://www.ticketfairy.com/event/a/b', 'unrecognised'],
    ['https://www.ticketfairy.com/pass/summer', 'unrecognised'],
    ['https://www.ticketfairy.com/event/<script>', 'unrecognised'],
    ['javascript://www.ticketfairy.com/event/anyma', 'not-ticket-fairy'],
    ['ftp://www.ticketfairy.com/event/anyma', 'not-ticket-fairy'],
  ])('rejects %j as %s', (link, reason) => {
    expect(parseTicketFairyLink(link)).toEqual({ kind: 'invalid', reason })
  })
})

describe('embedAttributes', () => {
  it('builds a buy button with its label', () => {
    expect(embedAttributes({ type: 'button', eventSlug: 'party', buttonLabel: ' Get tickets ' })).toEqual({
      'data-ttf-embed': 'button',
      'data-event': 'party',
      'data-label': 'Get tickets',
    })
  })

  it('uses the brand for the event list and ignores the event', () => {
    expect(embedAttributes({ type: 'listing', brandSlug: 'zamna', eventSlug: 'party' })).toEqual({
      'data-ttf-embed': 'listing',
      'data-brand': 'zamna',
    })
  })

  it('returns null until the needed link is chosen', () => {
    expect(embedAttributes({ type: 'checkout' })).toBeNull()
    expect(embedAttributes({ type: 'listing', eventSlug: 'party' })).toBeNull()
  })

  it('keeps only a well-formed embed key', () => {
    const key = 'A'.repeat(64)
    expect(embedAttributes({ type: 'lineup', eventSlug: 'party', widgetKey: key })).toMatchObject({
      'data-widget-key': 'a'.repeat(64),
    })
    expect(embedAttributes({ type: 'lineup', eventSlug: 'party', widgetKey: 'nope' })).not.toHaveProperty(
      'data-widget-key'
    )
  })

  it('escapes attribute values in HTML', () => {
    expect(embedPlaceholderHtml({ type: 'button', eventSlug: 'party', buttonLabel: '"><img src=x>' })).toBe(
      '<div data-ttf-embed="button" data-event="party" data-label="&quot;&gt;&lt;img src=x&gt;"></div>'
    )
  })
})

describe('fetchBrandEvents', () => {
  const jsonResponse = (status: number, body: unknown) =>
    ({ status, ok: status >= 200 && status < 300, json: async () => body }) as Response

  it('maps listing cards and paging', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(200, {
        events: [
          { name: 'Renaissance', url_name: 'renaissance', start_date: '2026-12-31T22:00:00-05:00', sold_out: false },
          { name: 'No slug' },
        ],
        pagination: { has_more: true },
      })
    )

    const page = await fetchBrandEvents('zamna festival', { page: 2, fetchImpl })

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://www.ticketfairy.com/api/embed/events/zamna%20festival?page=2&per_page=24',
      expect.objectContaining({ credentials: 'omit' })
    )
    expect(page.hasMore).toBe(true)
    expect(page.events).toHaveLength(1)
    expect(page.events[0]).toMatchObject({ name: 'Renaissance', eventSlug: 'renaissance', soldOut: false })
  })

  it('stops paging at the last page the server serves', async () => {
    const fetchImpl = async () => jsonResponse(200, { events: [], pagination: { has_more: true } })
    expect((await fetchBrandEvents('x', { page: 50, fetchImpl })).hasMore).toBe(false)
    expect((await fetchBrandEvents('x', { page: 49, fetchImpl })).hasMore).toBe(true)
  })

  it('reports an unknown brand separately from other failures', async () => {
    await expect(fetchBrandEvents('x', { fetchImpl: async () => jsonResponse(404, {}) })).rejects.toBeInstanceOf(
      BrandNotFoundError
    )
    await expect(fetchBrandEvents('x', { fetchImpl: async () => jsonResponse(500, {}) })).rejects.toThrow(
      'status 500'
    )
  })
})

describe('describeEvent', () => {
  const event = {
    name: 'Renaissance',
    eventSlug: 'renaissance',
    url: '',
    startDate: '2026-12-31T22:00:00-05:00',
    timezone: 'America/Cancun',
    venueName: 'Zamna Tulum',
    city: 'Tulum',
    imageUrl: null,
    soldOut: false,
  }

  it('shows the local date and place', () => {
    expect(describeEvent(event, 'en-GB')).toBe('Thu, 31 Dec 2026 · Zamna Tulum, Tulum')
  })

  it('survives an unknown time zone', () => {
    expect(describeEvent({ ...event, timezone: 'Not/AZone' }, 'en-GB')).toMatch(/\d{4} · Zamna Tulum/)
  })
})

describe('isWidgetKey', () => {
  it('accepts only a complete 64-character key', () => {
    expect(isWidgetKey(` ${'AB'.repeat(32)} `)).toBe(true)
    expect(isWidgetKey('ab'.repeat(31))).toBe(false)
    expect(isWidgetKey(undefined)).toBe(false)
  })
})
