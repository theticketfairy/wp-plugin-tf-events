import type { EmbedType } from '@ticketfairy/site-embed-core'

declare const wp: any

const { __ } = wp.i18n

// One place for the names organisers see, so the settings list, the inserter
// and the preview card always agree. Each call to __() needs a literal
// string, so WordPress can find it for translation.
export const typeLabel = (type: EmbedType): string => {
  switch (type) {
    case 'button':
      return __('Buy tickets button', 'ticket-fairy-events')
    case 'checkout':
      return __('Checkout on the page', 'ticket-fairy-events')
    case 'listing':
      return __('Your event list', 'ticket-fairy-events')
    case 'timetable':
      return __('Set times', 'ticket-fairy-events')
    case 'lineup':
      return __('Line-up', 'ticket-fairy-events')
  }
}

const typeDescription = (type: EmbedType): string => {
  switch (type) {
    case 'button':
      return __('A button that opens the checkout over your page.', 'ticket-fairy-events')
    case 'checkout':
      return __('Ticket choice and payment, right on your page.', 'ticket-fairy-events')
    case 'listing':
      return __('All your upcoming events, with tickets on sale on your page.', 'ticket-fairy-events')
    case 'timetable':
      return __('Who plays when, by day and stage.', 'ticket-fairy-events')
    case 'lineup':
      return __('The acts, with photos and links.', 'ticket-fairy-events')
  }
}

const ORDER: EmbedType[] = ['button', 'checkout', 'listing', 'timetable', 'lineup']

export const showOptions = () => ORDER.map((type) => ({ value: type, label: typeLabel(type) }))

/** Each type also appears in the block inserter under its own name. */
export const blockVariations = () =>
  ORDER.map((type) => ({
    name: type,
    // The brand name is never translated.
    title: `Ticket Fairy: ${typeLabel(type)}`,
    description: typeDescription(type),
    attributes: { show: type },
    isDefault: type === 'button',
    scope: ['inserter', 'transform'],
    isActive: ['show'],
  }))
