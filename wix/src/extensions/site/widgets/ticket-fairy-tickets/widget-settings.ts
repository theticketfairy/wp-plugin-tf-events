/**
 * The widget's saved settings and the words the organiser sees about them.
 *
 * Wix saves the settings panel's values as widget props and copies each prop
 * to an attribute of the same name on the widget element. Attribute names
 * must be kebab-case, so the panel and the widget both use these names.
 */
import {
  brandPageUrl,
  embedAttributes,
  eventPageUrl,
  isEmbedType,
  linkKindFor,
  parseTicketFairyLink,
  type EmbedSettings,
  type EmbedType,
  type ParsedLink,
} from '@ticketfairy/site-embed-core'

export const PROP_NAMES = {
  link: 'link',
  show: 'show',
  event: 'event',
  eventName: 'event-name',
  buttonText: 'button-text',
  embedKey: 'embed-key',
} as const

export type PropKey = keyof typeof PROP_NAMES

export type WidgetProps = Partial<Record<PropKey, string>>

export const OBSERVED_ATTRIBUTES: string[] = Object.values(PROP_NAMES)

export const SHOW_OPTIONS: { type: EmbedType; label: string }[] = [
  { type: 'button', label: 'Buy tickets button' },
  { type: 'checkout', label: 'Checkout on the page' },
  { type: 'listing', label: 'Event list' },
  { type: 'timetable', label: 'Set times' },
  { type: 'lineup', label: 'Line-up' },
]

const SHOW_LABELS = Object.fromEntries(SHOW_OPTIONS.map(({ type, label }) => [type, label])) as Record<
  EmbedType,
  string
>

export function readProps(element: Element): WidgetProps {
  const props: WidgetProps = {}

  for (const key of Object.keys(PROP_NAMES) as PropKey[]) {
    const value = element.getAttribute(PROP_NAMES[key])

    if (value !== null) {
      props[key] = value
    }
  }

  return props
}

/**
 * What the widget shows. Until the organiser picks, a brand page link shows
 * the event list and an event page link shows the buy button, because that is
 * what each link is most likely pasted for.
 */
export function chosenType(
  props: WidgetProps,
  link: ParsedLink = parseTicketFairyLink(props.link ?? '')
): EmbedType {
  if (isEmbedType(props.show)) {
    return props.show
  }

  return link.kind === 'brand' ? 'listing' : 'button'
}

export function embedSettingsFromProps(props: WidgetProps): EmbedSettings | null {
  const link = parseTicketFairyLink(props.link ?? '')

  if (link.kind === 'invalid') {
    return null
  }

  return {
    type: chosenType(props, link),
    eventSlug: link.kind === 'event' ? link.eventSlug : props.event || undefined,
    brandSlug: link.kind === 'brand' ? link.brandSlug : undefined,
    buttonLabel: props.buttonText,
    widgetKey: props.embedKey,
  }
}

/** The placeholder attributes for the live site, or null when setup is not finished. */
export function placeholderAttributesFromProps(props: WidgetProps): Record<string, string> | null {
  const settings = embedSettingsFromProps(props)

  return settings ? embedAttributes(settings) : null
}

/** The problem with a pasted link, said so an organiser can fix it, or null when it is fine. */
export function linkProblem(link: ParsedLink): string | null {
  if (link.kind !== 'invalid' || link.reason === 'empty') {
    return null
  }

  if (link.reason === 'not-ticket-fairy') {
    return "That isn't a Ticket Fairy link. Copy the link from your event page or brand page."
  }

  return "That link doesn't open an event page or a brand page. Copy the link from your event page or brand page."
}

/**
 * The props to write when the organiser pastes a new link. A chosen event
 * belongs to one brand, so it is cleared when the brand changes, and the
 * event list needs a brand page link, so that choice is cleared for an event
 * page link.
 */
export function propsForNewLink(current: WidgetProps, newLink: string): WidgetProps {
  const before = parseTicketFairyLink(current.link ?? '')
  const after = parseTicketFairyLink(newLink)
  const changes: WidgetProps = { link: newLink.trim() }
  const sameBrand = before.kind === 'brand' && after.kind === 'brand' && before.brandSlug === after.brandSlug

  if (!sameBrand && (current.event || current.eventName)) {
    changes.event = ''
    changes.eventName = ''
  }

  if (after.kind === 'event' && current.show === 'listing') {
    changes.show = ''
  }

  return changes
}

export interface PreviewCopy {
  title: string
  detail: string
}

function shortLink(url: string): string {
  return url.replace(/^https:\/\/www\./, '')
}

/** What the editor shows in place of the live embed, so the page is easy to lay out. */
export function previewCopy(props: WidgetProps): PreviewCopy {
  const link = parseTicketFairyLink(props.link ?? '')

  if (link.kind === 'invalid') {
    return {
      title: 'Ticket Fairy Tickets',
      detail: linkProblem(link) ?? 'Open Settings and paste your Ticket Fairy link.',
    }
  }

  const type = chosenType(props, link)
  const title = SHOW_LABELS[type]

  if (linkKindFor(type) === 'brand') {
    if (link.kind !== 'brand') {
      return { title, detail: 'The event list needs your brand page link. Open Settings and paste it.' }
    }

    return {
      title,
      detail: `Events from ${shortLink(brandPageUrl(link.brandSlug))}. Your visitors see it here on your live site.`,
    }
  }

  const eventSlug = link.kind === 'event' ? link.eventSlug : props.event

  if (!eventSlug) {
    return { title, detail: 'Open Settings and choose an event.' }
  }

  const eventLabel = (link.kind === 'brand' && props.eventName) || shortLink(eventPageUrl(eventSlug))

  return { title, detail: `For ${eventLabel}. Your visitors see it here on your live site.` }
}
