import {
  linkKindFor,
  type EmbedSettings,
  type EmbedType,
  type ParsedLink,
} from '@ticketfairy/site-embed-core'

export const SHOW_OPTIONS: ReadonlyArray<{ type: EmbedType; label: string }> = [
  { type: 'button', label: 'Buy tickets button' },
  { type: 'checkout', label: 'Checkout on the page' },
  { type: 'listing', label: 'Event list' },
  { type: 'timetable', label: 'Set times' },
  { type: 'lineup', label: 'Line-up' },
]

export interface PanelChoices {
  link: ParsedLink
  type: EmbedType
  /** Event picked from the brand's list. Only used with a brand link. */
  pickedEventSlug?: string
  buttonLabel: string
  widgetKey: string
}

/** A brand link shows one event only after the organiser picks it from the brand's list. */
export function needsEventPicker(link: ParsedLink, type: EmbedType): boolean {
  return link.kind === 'brand' && linkKindFor(type) === 'event'
}

export function embedSettingsFor(choices: PanelChoices): EmbedSettings {
  const { link, type, buttonLabel, widgetKey } = choices

  if (link.kind === 'brand') {
    return { type, brandSlug: link.brandSlug, eventSlug: choices.pickedEventSlug, buttonLabel, widgetKey }
  }

  if (link.kind === 'event') {
    return { type, eventSlug: link.eventSlug, buttonLabel, widgetKey }
  }

  return { type, buttonLabel, widgetKey }
}

/** The problem to show under the link field, or null when there is nothing to fix. */
export function linkProblem(link: ParsedLink, type: EmbedType): string | null {
  if (link.kind === 'invalid') {
    if (link.reason === 'empty') {
      return null
    }

    return link.reason === 'not-ticket-fairy'
      ? "That isn't a Ticket Fairy link. Copy the link from your event page or brand page."
      : "That link doesn't open an event page or a brand page. Copy the link from your event page or brand page."
  }

  if (link.kind === 'event' && linkKindFor(type) === 'brand') {
    return (
      'The event list needs your brand page link. ' +
      'It looks like https://www.ticketfairy.com/events/your-brand.'
    )
  }

  return null
}

/**
 * Core drops an embed key that is not well formed. Tell the organiser,
 * because otherwise their saved colours silently do not apply.
 */
export function widgetKeyProblem(
  widgetKey: string,
  attributes: Record<string, string> | null
): string | null {
  if (!widgetKey.trim() || !attributes || attributes['data-widget-key']) {
    return null
  }

  return (
    "That embed key doesn't look right. " +
    'Copy it again from Embed on your website in your Ticket Fairy dashboard.'
  )
}
