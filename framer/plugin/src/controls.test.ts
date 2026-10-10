import { BrandNotFoundError, parseTicketFairyLink } from '@ticketfairy/site-embed-core'
import { describe, expect, it } from 'vitest'

import {
  buildControls,
  EVENT_SHOW_OPTIONS,
  eventsProblem,
  EVENTS_PROBLEMS,
  type PanelChoices,
} from './controls'

const eventLink = parseTicketFairyLink('ticketfairy.com/event/anyma-tulum-2027?r=promoter')
const brandLink = parseTicketFairyLink('https://www.ticketfairy.com/events/zamna-festival')

const choices = (overrides: Partial<PanelChoices>): PanelChoices => ({
  link: eventLink,
  chosenEventSlug: null,
  show: 'button',
  buttonText: '',
  ...overrides,
})

describe('buildControls', () => {
  it('writes a clean event link and the button text for an event link', () => {
    expect(buildControls(choices({ buttonText: ' Get tickets ' }))).toEqual({
      link: 'https://www.ticketfairy.com/event/anyma-tulum-2027',
      show: 'button',
      buttonText: 'Get tickets',
    })
  })

  it('leaves out the button text for other options', () => {
    expect(buildControls(choices({ show: 'checkout', buttonText: 'Get tickets' }))).toEqual({
      link: 'https://www.ticketfairy.com/event/anyma-tulum-2027',
      show: 'checkout',
    })
  })

  it('adds the event list when a brand link has no event chosen', () => {
    expect(buildControls(choices({ link: brandLink, show: 'lineup' }))).toEqual({
      link: 'https://www.ticketfairy.com/events/zamna-festival',
      show: 'listing',
    })
  })

  it('uses the chosen event for a brand link', () => {
    const chosen = choices({ link: brandLink, chosenEventSlug: 'zamna-2027', show: 'timetable' })

    expect(buildControls(chosen)).toEqual({
      link: 'https://www.ticketfairy.com/event/zamna-2027',
      show: 'timetable',
    })
  })

  it('falls back to the buy button when a single event has the event list chosen', () => {
    expect(buildControls(choices({ show: 'listing' }))?.show).toBe('button')
  })

  it('returns nothing for a link that cannot be used', () => {
    expect(buildControls(choices({ link: parseTicketFairyLink('https://example.com') }))).toBeNull()
  })
})

describe('EVENT_SHOW_OPTIONS', () => {
  it('offers everything except the event list for one event', () => {
    expect(EVENT_SHOW_OPTIONS).toEqual(['button', 'checkout', 'timetable', 'lineup'])
  })
})

describe('eventsProblem', () => {
  it('tells the organiser when the brand page does not exist', () => {
    expect(eventsProblem(new BrandNotFoundError('nobody'))).toBe(EVENTS_PROBLEMS.brandNotFound)
  })

  it('suggests trying again for any other failure', () => {
    expect(eventsProblem(new TypeError('Failed to fetch'))).toBe(EVENTS_PROBLEMS.loadFailed)
  })
})
