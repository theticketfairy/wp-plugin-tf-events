/**
 * The embed placeholders every plugin writes into a page.
 *
 * Each plugin only places a `data-ttf-embed` placeholder and loads the
 * Ticket Fairy embed loader once. The loader (served from the consumer site)
 * turns each placeholder into the button, checkout, event list or line-up,
 * so checkout behaviour, payments and attribution stay identical to a
 * hand-pasted snippet. See legacy docs/EVENT_EMBEDS.md for the contract.
 */

export const LOADER_URL = 'https://www.ticketfairy.com/resources/js/event-embed.js'

export const EMBED_TYPES = ['button', 'checkout', 'listing', 'timetable', 'lineup'] as const

export type EmbedType = (typeof EMBED_TYPES)[number]

/** Which link an embed type needs: one event, or the brand's whole list. */
export function linkKindFor(type: EmbedType): 'event' | 'brand' {
  return type === 'listing' ? 'brand' : 'event'
}

export interface EmbedSettings {
  type: EmbedType
  /** Event web address name. Used by every type except `listing`. */
  eventSlug?: string
  /** Brand web address name. Used by `listing`. */
  brandSlug?: string
  /** Text on the buy button. The loader uses "Buy tickets" when empty. */
  buttonLabel?: string
  /** Optional dashboard embed key, for saved theming and allowed websites. */
  widgetKey?: string
}

const WIDGET_KEY_PATTERN = /^[a-f0-9]{64}$/

export function isEmbedType(value: unknown): value is EmbedType {
  return typeof value === 'string' && (EMBED_TYPES as readonly string[]).includes(value)
}

/**
 * Attributes for the placeholder element, or null when the settings are not
 * complete enough to show anything (for example, no event chosen yet).
 */
export function embedAttributes(settings: EmbedSettings): Record<string, string> | null {
  const { type } = settings
  const attributes: Record<string, string> = { 'data-ttf-embed': type }

  if (linkKindFor(type) === 'brand') {
    if (!settings.brandSlug) {
      return null
    }
    attributes['data-brand'] = settings.brandSlug
  } else {
    if (!settings.eventSlug) {
      return null
    }
    attributes['data-event'] = settings.eventSlug
  }

  const label = settings.buttonLabel?.trim()

  if (type === 'button' && label) {
    attributes['data-label'] = label
  }

  const widgetKey = settings.widgetKey?.trim().toLowerCase()

  if (widgetKey && WIDGET_KEY_PATTERN.test(widgetKey)) {
    attributes['data-widget-key'] = widgetKey
  }

  return attributes
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/** The placeholder as HTML, for builders that take an HTML string. */
export function embedPlaceholderHtml(settings: EmbedSettings): string | null {
  const attributes = embedAttributes(settings)

  if (!attributes) {
    return null
  }

  const serialised = Object.entries(attributes)
    .map(([name, value]) => `${name}="${escapeAttribute(value)}"`)
    .join(' ')

  return `<div ${serialised}></div>`
}

export const LOADER_SCRIPT_HTML = `<script src="${LOADER_URL}" async></script>`

interface EmbedLoaderGlobal {
  scan?: () => void
}

declare global {
  interface Window {
    TTFEmbed?: EmbedLoaderGlobal
  }
}

/**
 * Loads the embed loader once per page, then asks it to look for new
 * placeholders. Builders that render pages on the client (Framer, Wix)
 * add placeholders after the loader's first scan, so every new placeholder
 * calls this.
 */
export function loadEmbedsAndScan(doc: Document = document): void {
  const win = doc.defaultView

  if (win?.TTFEmbed?.scan) {
    win.TTFEmbed.scan()

    return
  }

  // The loader scans the page itself when it first runs.
  if (doc.querySelector(`script[src="${LOADER_URL}"]`)) {
    return
  }

  const script = doc.createElement('script')
  script.src = LOADER_URL
  script.async = true
  doc.body.appendChild(script)
}
