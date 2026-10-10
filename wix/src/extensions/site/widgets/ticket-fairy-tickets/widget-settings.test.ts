import { describe, expect, it } from 'vitest'
import { parseTicketFairyLink } from '@ticketfairy/site-embed-core'
import {
  chosenType,
  linkProblem,
  placeholderAttributesFromProps,
  previewCopy,
  propsForNewLink,
  readProps,
} from './widget-settings'

const EVENT_LINK = 'https://www.ticketfairy.com/event/renaissance'
const BRAND_LINK = 'https://www.ticketfairy.com/events/zamna-festival'

describe('readProps', () => {
  it('reads the kebab-case attributes Wix sets', () => {
    const element = document.createElement('div')
    element.setAttribute('link', EVENT_LINK)
    element.setAttribute('button-text', 'Get tickets')
    element.setAttribute('event-name', 'Renaissance')

    expect(readProps(element)).toEqual({
      link: EVENT_LINK,
      buttonText: 'Get tickets',
      eventName: 'Renaissance',
    })
  })
})

describe('chosenType', () => {
  it('defaults to the button for an event link and the event list for a brand link', () => {
    expect(chosenType({ link: EVENT_LINK })).toBe('button')
    expect(chosenType({ link: BRAND_LINK })).toBe('listing')
    expect(chosenType({})).toBe('button')
  })

  it('keeps the organiser choice and ignores unknown values', () => {
    expect(chosenType({ link: BRAND_LINK, show: 'checkout' })).toBe('checkout')
    expect(chosenType({ link: EVENT_LINK, show: 'carousel' })).toBe('button')
  })
})

describe('placeholderAttributesFromProps', () => {
  it('builds a buy button from an event link', () => {
    expect(placeholderAttributesFromProps({ link: EVENT_LINK, buttonText: 'Get tickets' })).toEqual({
      'data-ttf-embed': 'button',
      'data-event': 'renaissance',
      'data-label': 'Get tickets',
    })
  })

  it('builds the event list from a brand link', () => {
    expect(placeholderAttributesFromProps({ link: BRAND_LINK })).toEqual({
      'data-ttf-embed': 'listing',
      'data-brand': 'zamna-festival',
    })
  })

  it('uses the event chosen from a brand link, with the embed key', () => {
    const key = 'b'.repeat(64)

    expect(
      placeholderAttributesFromProps({
        link: BRAND_LINK,
        show: 'checkout',
        event: 'renaissance',
        embedKey: key,
      })
    ).toEqual({ 'data-ttf-embed': 'checkout', 'data-event': 'renaissance', 'data-widget-key': key })
  })

  it('shows nothing until the settings are complete', () => {
    expect(placeholderAttributesFromProps({})).toBeNull()
    expect(placeholderAttributesFromProps({ link: 'https://example.com/event/x' })).toBeNull()
    expect(placeholderAttributesFromProps({ link: BRAND_LINK, show: 'lineup' })).toBeNull()
    expect(placeholderAttributesFromProps({ link: EVENT_LINK, show: 'listing' })).toBeNull()
  })

  it('ignores a saved event when the link is an event page', () => {
    expect(placeholderAttributesFromProps({ link: EVENT_LINK, event: 'other' })).toMatchObject({
      'data-event': 'renaissance',
    })
  })
})

describe('linkProblem', () => {
  it('says nothing for a good or empty link', () => {
    expect(linkProblem(parseTicketFairyLink(EVENT_LINK))).toBeNull()
    expect(linkProblem(parseTicketFairyLink(''))).toBeNull()
  })

  it('tells the organiser how to fix a wrong link', () => {
    expect(linkProblem(parseTicketFairyLink('https://example.com'))).toBe(
      "That isn't a Ticket Fairy link. Copy the link from your event page or brand page."
    )
    expect(linkProblem(parseTicketFairyLink('https://www.ticketfairy.com/'))).toMatch(
      /event page or a brand page/
    )
  })
})

describe('propsForNewLink', () => {
  it('clears the chosen event when the brand changes', () => {
    const current = { link: BRAND_LINK, event: 'renaissance', eventName: 'Renaissance' }

    expect(propsForNewLink(current, 'https://www.ticketfairy.com/events/other-brand')).toEqual({
      link: 'https://www.ticketfairy.com/events/other-brand',
      event: '',
      eventName: '',
    })
  })

  it('keeps the chosen event for the same brand', () => {
    const current = { link: BRAND_LINK, event: 'renaissance', eventName: 'Renaissance' }

    expect(propsForNewLink(current, ` ${BRAND_LINK}/ `)).toEqual({ link: `${BRAND_LINK}/` })
  })

  it('clears the event list choice for an event link', () => {
    expect(propsForNewLink({ link: BRAND_LINK, show: 'listing' }, EVENT_LINK)).toEqual({
      link: EVENT_LINK,
      show: '',
    })
  })
})

describe('previewCopy', () => {
  it('asks for a link first', () => {
    expect(previewCopy({}).detail).toBe('Open Settings and paste your Ticket Fairy link.')
  })

  it('explains a wrong link', () => {
    expect(previewCopy({ link: 'https://example.com' }).detail).toMatch(/^That isn't a Ticket Fairy link/)
  })

  it('asks for an event when a brand link needs one', () => {
    expect(previewCopy({ link: BRAND_LINK, show: 'button' })).toEqual({
      title: 'Buy tickets button',
      detail: 'Open Settings and choose an event.',
    })
  })

  it('names the chosen event', () => {
    expect(
      previewCopy({ link: BRAND_LINK, show: 'timetable', event: 'renaissance', eventName: 'Renaissance' })
    ).toEqual({
      title: 'Set times',
      detail: 'For Renaissance. Your visitors see it here on your live site.',
    })
    expect(previewCopy({ link: EVENT_LINK }).detail).toBe(
      'For ticketfairy.com/event/renaissance. Your visitors see it here on your live site.'
    )
  })

  it('describes the event list and its missing brand link', () => {
    expect(previewCopy({ link: BRAND_LINK }).title).toBe('Event list')
    expect(previewCopy({ link: EVENT_LINK, show: 'listing' }).detail).toBe(
      'The event list needs your brand page link. Open Settings and paste it.'
    )
  })
})
