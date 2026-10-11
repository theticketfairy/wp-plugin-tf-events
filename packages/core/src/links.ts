/**
 * Reads the Ticket Fairy link an organiser pastes into a plugin.
 *
 * Organisers already have two kinds of public link, so the plugins ask for
 * nothing else:
 *   - an event page:  https://www.ticketfairy.com/event/<event-name>
 *   - a brand page:   https://www.ticketfairy.com/events/<brand-name>
 *
 * The paste is forgiving: the protocol, `www.`, a trailing slash, a query
 * string or a fragment do not matter, and the dashboard host
 * (theticketfairy.com) is accepted because organisers copy links from both.
 */

export type ParsedLink =
  | { kind: 'event'; eventSlug: string }
  | { kind: 'brand'; brandSlug: string }
  | { kind: 'invalid'; reason: 'empty' | 'not-ticket-fairy' | 'unrecognised' }

const ACCEPTED_HOSTS = new Set([
  'ticketfairy.com',
  'www.ticketfairy.com',
  'theticketfairy.com',
  'www.theticketfairy.com',
])

// Same character set the backend accepts for event and brand url names.
const SLUG_PATTERN = /^[a-z0-9_-]+$/i

export function parseTicketFairyLink(input: string): ParsedLink {
  const trimmed = (input || '').trim()

  if (trimmed === '') {
    return { kind: 'invalid', reason: 'empty' }
  }

  const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`

  let url: URL

  try {
    url = new URL(withProtocol)
  } catch {
    return { kind: 'invalid', reason: 'unrecognised' }
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return { kind: 'invalid', reason: 'not-ticket-fairy' }
  }

  if (!ACCEPTED_HOSTS.has(url.hostname.toLowerCase())) {
    return { kind: 'invalid', reason: 'not-ticket-fairy' }
  }

  const [section, slug, ...rest] = url.pathname.split('/').filter(Boolean)

  if (!slug || rest.length > 0 || !SLUG_PATTERN.test(slug)) {
    return { kind: 'invalid', reason: 'unrecognised' }
  }

  if (section === 'event') {
    return { kind: 'event', eventSlug: slug }
  }

  if (section === 'events') {
    return { kind: 'brand', brandSlug: slug }
  }

  return { kind: 'invalid', reason: 'unrecognised' }
}

export function eventPageUrl(eventSlug: string): string {
  return `https://www.ticketfairy.com/event/${encodeURIComponent(eventSlug)}`
}

export function brandPageUrl(brandSlug: string): string {
  return `https://www.ticketfairy.com/events/${encodeURIComponent(brandSlug)}`
}
