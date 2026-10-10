/**
 * Turns the component's property values into embed attributes and the
 * plain-language text the canvas card shows.
 *
 * The Ticket Fairy Tickets plugin writes the same property names when it
 * adds the component, so the plugin imports them from here.
 */

import {
  embedAttributes,
  isEmbedType,
  linkKindFor,
  parseTicketFairyLink,
  type EmbedType,
} from '@ticketfairy/site-embed-core'

/** The component's property values, as Framer passes them. */
export interface TicketFairyTicketsProps {
  link?: string
  show?: EmbedType
  buttonText?: string
  advanced?: { embedKey?: string }
}

/** The property values the plugin sets when it adds the component. */
export interface ComponentControls {
  link: string
  show: EmbedType
  buttonText?: string
}

export const DEFAULT_SHOW: EmbedType = 'button'

export const SHOW_LABELS: Record<EmbedType, string> = {
  button: 'Buy tickets button',
  checkout: 'Checkout on the page',
  listing: 'Event list',
  timetable: 'Set times',
  lineup: 'Line-up',
}

const COPY_LINK_STEP = 'Copy the link from your event page or brand page.'

export const LINK_PROBLEMS = {
  'not-ticket-fairy': `That isn't a Ticket Fairy link. ${COPY_LINK_STEP}`,
  unrecognised: `That link doesn't open an event page or brand page. ${COPY_LINK_STEP}`,
} as const

export const EMBED_KEY_HELP =
  'From Embed on your website in your Ticket Fairy dashboard. ' +
  'Only needed for saved colours and allowed websites.'

const SUMMARIES: Record<EmbedType, (name: string) => string> = {
  button: (name) => `Buy tickets button for ${name}`,
  checkout: (name) => `Checkout for ${name}`,
  listing: (name) => `Event list for ${name}`,
  timetable: (name) => `Set times for ${name}`,
  lineup: (name) => `Line-up for ${name}`,
}

export interface EmbedPreview {
  /** Attributes for the embed element, or null when nothing can be shown yet. */
  attributes: Record<string, string> | null
  /** What will appear, or what the organiser must fix. */
  message: string
  /** A second line for a problem that does not stop the embed from showing. */
  note: string | null
}

/** "anyma-tulum-2027" becomes "Anyma Tulum 2027", so the canvas card reads naturally. */
export function nameFromLink(urlName: string): string {
  return urlName
    .split(/[-_]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function readSettings(props: TicketFairyTicketsProps): EmbedPreview {
  const show = isEmbedType(props.show) ? props.show : DEFAULT_SHOW
  const neededLink = linkKindFor(show)
  const parsed = parseTicketFairyLink(props.link ?? '')

  if (parsed.kind === 'invalid') {
    const message =
      parsed.reason === 'empty'
        ? `Paste your Ticket Fairy ${neededLink === 'brand' ? 'brand page' : 'event'} link`
        : LINK_PROBLEMS[parsed.reason]

    return { attributes: null, message, note: null }
  }

  if (parsed.kind !== neededLink) {
    const message =
      neededLink === 'brand'
        ? 'The event list needs your brand page link, not an event link. Copy the link from your brand page.'
        : 'This option needs an event link, not your brand page link. Copy the link from the event page, ' +
          'or use the Ticket Fairy Tickets plugin to choose one of your events.'

    return { attributes: null, message, note: null }
  }

  const urlName = parsed.kind === 'brand' ? parsed.brandSlug : parsed.eventSlug
  const embedKey = props.advanced?.embedKey?.trim()
  const attributes = embedAttributes({
    type: show,
    eventSlug: parsed.kind === 'event' ? parsed.eventSlug : undefined,
    brandSlug: parsed.kind === 'brand' ? parsed.brandSlug : undefined,
    buttonLabel: props.buttonText,
    widgetKey: embedKey,
  })

  // embedAttributes leaves out a key that is not in the dashboard's format.
  const note =
    embedKey && attributes && !attributes['data-widget-key']
      ? "The embed key isn't recognised, so saved colours aren't used. " +
        'Copy it again from Embed on your website in your Ticket Fairy dashboard.'
      : null

  return { attributes, message: SUMMARIES[show](nameFromLink(urlName)), note }
}
