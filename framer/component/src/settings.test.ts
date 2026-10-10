import { describe, expect, it } from 'vitest'

import { LINK_PROBLEMS, nameFromLink, readSettings } from './settings'

const EVENT_LINK = 'https://www.ticketfairy.com/event/anyma-tulum-2027'
const BRAND_LINK = 'https://www.ticketfairy.com/events/zamna-festival'
const EMBED_KEY = 'a'.repeat(64)

describe('nameFromLink', () => {
  it('turns a link name into words', () => {
    expect(nameFromLink('anyma-tulum_2027')).toBe('Anyma Tulum 2027')
  })
})

describe('readSettings', () => {
  it('describes a buy button and passes the button text', () => {
    expect(readSettings({ link: EVENT_LINK, show: 'button', buttonText: 'Get tickets' })).toEqual({
      attributes: {
        'data-ttf-embed': 'button',
        'data-event': 'anyma-tulum-2027',
        'data-label': 'Get tickets',
      },
      message: 'Buy tickets button for Anyma Tulum 2027',
      note: null,
    })
  })

  it('shows a buy button when nothing is chosen yet', () => {
    expect(readSettings({ link: EVENT_LINK }).attributes).toEqual({
      'data-ttf-embed': 'button',
      'data-event': 'anyma-tulum-2027',
    })
  })

  it.each([
    ['checkout', 'Checkout for Anyma Tulum 2027'],
    ['timetable', 'Set times for Anyma Tulum 2027'],
    ['lineup', 'Line-up for Anyma Tulum 2027'],
  ] as const)('describes %s for an event link', (show, message) => {
    const preview = readSettings({ link: EVENT_LINK, show, buttonText: 'Ignored' })

    expect(preview.message).toBe(message)
    expect(preview.attributes).toEqual({ 'data-ttf-embed': show, 'data-event': 'anyma-tulum-2027' })
  })

  it('describes the event list for a brand page link', () => {
    expect(readSettings({ link: BRAND_LINK, show: 'listing' })).toEqual({
      attributes: { 'data-ttf-embed': 'listing', 'data-brand': 'zamna-festival' },
      message: 'Event list for Zamna Festival',
      note: null,
    })
  })

  it('asks for the right kind of link when the link is empty', () => {
    expect(readSettings({ show: 'checkout' }).message).toBe('Paste your Ticket Fairy event link')
    expect(readSettings({ link: ' ', show: 'listing' }).message).toBe(
      'Paste your Ticket Fairy brand page link'
    )
  })

  it('explains a link that is not a Ticket Fairy link', () => {
    expect(readSettings({ link: 'https://example.com/event/x' })).toEqual({
      attributes: null,
      message: LINK_PROBLEMS['not-ticket-fairy'],
      note: null,
    })
    expect(readSettings({ link: 'https://www.ticketfairy.com/pass/x' }).message).toBe(
      LINK_PROBLEMS.unrecognised
    )
  })

  it('explains a link of the wrong kind for the chosen option', () => {
    expect(readSettings({ link: BRAND_LINK, show: 'button' }).attributes).toBeNull()
    expect(readSettings({ link: BRAND_LINK, show: 'button' }).message).toMatch(/needs an event link/)
    expect(readSettings({ link: EVENT_LINK, show: 'listing' }).message).toMatch(/needs your brand page link/)
  })

  it('passes a valid embed key', () => {
    const preview = readSettings({ link: EVENT_LINK, advanced: { embedKey: ` ${EMBED_KEY.toUpperCase()} ` } })

    expect(preview.attributes?.['data-widget-key']).toBe(EMBED_KEY)
    expect(preview.note).toBeNull()
  })

  it('still shows the embed, with a note, when the embed key is not recognised', () => {
    const preview = readSettings({ link: EVENT_LINK, advanced: { embedKey: 'not-a-key' } })

    expect(preview.attributes).not.toBeNull()
    expect(preview.attributes?.['data-widget-key']).toBeUndefined()
    expect(preview.note).toMatch(/embed key isn't recognised/)
  })
})
