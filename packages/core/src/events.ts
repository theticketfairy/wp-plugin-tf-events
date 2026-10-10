/**
 * Lists a brand's upcoming public events for the plugins' event pickers.
 *
 * Uses the open embed listing endpoint (GET /api/embed/events/:brand). It
 * needs no sign-in, allows calls from any website, returns at most 24 events
 * per page and is cached on the server for two minutes, so an editor
 * session costs a few cheap requests.
 */

const LISTING_ENDPOINT = 'https://www.ticketfairy.com/api/embed/events/'

export const EVENTS_PER_PAGE = 24

export interface BrandEvent {
  name: string
  eventSlug: string
  url: string
  startDate: string | null
  timezone: string | null
  venueName: string | null
  city: string | null
  imageUrl: string | null
  soldOut: boolean
}

export interface BrandEventsPage {
  events: BrandEvent[]
  hasMore: boolean
}

export class BrandNotFoundError extends Error {
  constructor(brandSlug: string) {
    super(`No Ticket Fairy brand page found for "${brandSlug}"`)
    this.name = 'BrandNotFoundError'
  }
}

interface ListingCard {
  name?: string
  url_name?: string
  url?: string
  start_date?: string | null
  timezone?: string | null
  venue_name?: string | null
  city?: string | null
  image_url?: string | null
  sold_out?: boolean
}

interface ListingResponse {
  events?: ListingCard[]
  pagination?: { has_more?: boolean }
}

function toBrandEvent(card: ListingCard): BrandEvent | null {
  if (!card.url_name) {
    return null
  }

  return {
    name: card.name || card.url_name,
    eventSlug: card.url_name,
    url: card.url || '',
    startDate: card.start_date ?? null,
    timezone: card.timezone ?? null,
    venueName: card.venue_name ?? null,
    city: card.city ?? null,
    imageUrl: card.image_url ?? null,
    soldOut: Boolean(card.sold_out),
  }
}

export async function fetchBrandEvents(
  brandSlug: string,
  options: { page?: number; signal?: AbortSignal; fetchImpl?: typeof fetch } = {}
): Promise<BrandEventsPage> {
  const { page = 1, signal, fetchImpl = fetch } = options
  const url = `${LISTING_ENDPOINT}${encodeURIComponent(brandSlug)}?page=${page}&per_page=${EVENTS_PER_PAGE}`
  const response = await fetchImpl(url, { signal, credentials: 'omit' })

  if (response.status === 404) {
    throw new BrandNotFoundError(brandSlug)
  }

  if (!response.ok) {
    throw new Error(`Event list request failed with status ${response.status}`)
  }

  const body = (await response.json()) as ListingResponse
  const events = (body.events ?? []).map(toBrandEvent).filter((event): event is BrandEvent => event !== null)

  return { events, hasMore: Boolean(body.pagination?.has_more) }
}

function formatEventDate(date: Date, timezone: string | null, locale?: string): string {
  const options: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }

  // Show the date where the event happens. An unknown time zone name throws,
  // so fall back to the visitor's own time zone.
  try {
    return new Intl.DateTimeFormat(locale, { ...options, timeZone: timezone || undefined }).format(date)
  } catch {
    return new Intl.DateTimeFormat(locale, options).format(date)
  }
}

/** A short "Sat 31 Dec 2026 · Zamna Tulum, Tulum" line for picker rows. */
export function describeEvent(event: BrandEvent, locale?: string): string {
  const parts: string[] = []

  if (event.startDate) {
    const date = new Date(event.startDate)

    if (!Number.isNaN(date.getTime())) {
      parts.push(formatEventDate(date, event.timezone, locale))
    }
  }

  const place = [event.venueName, event.city].filter(Boolean).join(', ')

  if (place) {
    parts.push(place)
  }

  return parts.join(' · ')
}
