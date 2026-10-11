import { type ComponentControls, DEFAULT_SHOW } from '@ticketfairy/framer-component/settings'
import {
  BrandNotFoundError,
  brandPageUrl,
  EMBED_TYPES,
  type EmbedType,
  eventPageUrl,
  linkKindFor,
  type ParsedLink,
} from '@ticketfairy/site-embed-core'

/**
 * The published Ticket Fairy Tickets code component.
 *
 * This URL exists only after the component is published (see framer/README.md,
 * "Publish the component"). Copy it from Assets > Code > right-click > Copy URL,
 * and remove the "@..." version part so that new component versions are used.
 */
export const COMPONENT_URL = 'https://framer.com/m/REPLACE-WITH-PUBLISHED-TicketFairyTickets.js'

/** What a single event can show. The event list needs the brand page instead. */
export const EVENT_SHOW_OPTIONS = EMBED_TYPES.filter((type) => linkKindFor(type) === 'event')

export const EVENTS_PROBLEMS = {
  brandNotFound: "We couldn't find that brand page. Check the link and try again.",
  loadFailed: "We couldn't load your events. Check your internet connection and try again.",
} as const

export function eventsProblem(error: unknown): string {
  return error instanceof BrandNotFoundError ? EVENTS_PROBLEMS.brandNotFound : EVENTS_PROBLEMS.loadFailed
}

export interface PanelChoices {
  link: ParsedLink
  /** For a brand page link: the chosen event, or null for all upcoming events. */
  chosenEventSlug: string | null
  show: EmbedType
  buttonText: string
}

/** The component's property values for the panel's choices, or null when the link is not usable. */
export function buildControls(choices: PanelChoices): ComponentControls | null {
  const { link } = choices

  if (link.kind === 'invalid') {
    return null
  }

  const eventSlug = link.kind === 'event' ? link.eventSlug : choices.chosenEventSlug

  if (!eventSlug) {
    return link.kind === 'brand' ? { link: brandPageUrl(link.brandSlug), show: 'listing' } : null
  }

  const show = linkKindFor(choices.show) === 'event' ? choices.show : DEFAULT_SHOW
  const controls: ComponentControls = { link: eventPageUrl(eventSlug), show }
  const buttonText = choices.buttonText.trim()

  if (show === 'button' && buttonText) {
    controls.buttonText = buttonText
  }

  return controls
}
