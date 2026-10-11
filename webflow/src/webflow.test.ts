import { embedAttributes, parseTicketFairyLink } from '@ticketfairy/site-embed-core'
import { describe, expect, it, vi } from 'vitest'
import { embedSettingsFor, linkProblem, needsEventPicker, widgetKeyProblem } from './choices'
import { ELEMENT_NAME, insertEmbedElement, insertErrorMessage, type DesignerApi } from './insert'
import { isLoaderConfirmed, setLoaderConfirmed } from './setup'

const eventLink = parseTicketFairyLink('https://www.ticketfairy.com/event/anyma-tulum')
const brandLink = parseTicketFairyLink('https://www.ticketfairy.com/events/zamna')
const noChoices = { buttonLabel: '', widgetKey: '' }

describe('panel choices', () => {
  it('uses the event from an event link', () => {
    const settings = embedSettingsFor({ link: eventLink, type: 'checkout', ...noChoices })
    expect(embedAttributes(settings)).toEqual({ 'data-ttf-embed': 'checkout', 'data-event': 'anyma-tulum' })
  })

  it('waits for an event to be picked from a brand link', () => {
    expect(needsEventPicker(brandLink, 'button')).toBe(true)
    expect(embedAttributes(embedSettingsFor({ link: brandLink, type: 'button', ...noChoices }))).toBeNull()

    const picked = embedSettingsFor({
      link: brandLink,
      type: 'button',
      pickedEventSlug: 'renaissance',
      ...noChoices,
    })
    expect(embedAttributes(picked)).toEqual({ 'data-ttf-embed': 'button', 'data-event': 'renaissance' })
  })

  it('shows the event list from a brand link without a picker', () => {
    expect(needsEventPicker(brandLink, 'listing')).toBe(false)
    const settings = embedSettingsFor({ link: brandLink, type: 'listing', ...noChoices })
    expect(embedAttributes(settings)).toEqual({ 'data-ttf-embed': 'listing', 'data-brand': 'zamna' })
  })

  it('explains a link that cannot work', () => {
    expect(linkProblem(parseTicketFairyLink(''), 'button')).toBeNull()
    expect(linkProblem(parseTicketFairyLink('https://example.com/event/x'), 'button')).toBe(
      "That isn't a Ticket Fairy link. Copy the link from your event page or brand page."
    )
    expect(linkProblem(eventLink, 'listing')).toMatch(/needs your brand page link/)
    expect(linkProblem(brandLink, 'button')).toBeNull()
  })

  it('flags an embed key that core dropped', () => {
    const lineupWithKey = (widgetKey: string) =>
      embedSettingsFor({ link: eventLink, type: 'lineup', buttonLabel: '', widgetKey })
    expect(widgetKeyProblem('nope', embedAttributes(lineupWithKey('nope')))).toMatch(/embed key/)

    const goodKey = 'a'.repeat(64)
    const withGoodKey = lineupWithKey(goodKey)
    expect(widgetKeyProblem(goodKey, embedAttributes(withGoodKey))).toBeNull()
    expect(widgetKeyProblem('', embedAttributes(withGoodKey))).toBeNull()
  })
})

function fakeDomElement() {
  return {
    setTag: vi.fn(async () => null),
    setAttribute: vi.fn(async () => null),
    setDisplayName: vi.fn(async () => null),
    remove: vi.fn(async () => null),
  }
}

function fakeApi(selected: unknown, root: unknown = null) {
  return {
    getSelectedElement: vi.fn(async () => selected),
    getRootElement: vi.fn(async () => root),
    elementPresets: { DOM: 'DOM preset' },
  } as unknown as DesignerApi
}

const attributes = { 'data-ttf-embed': 'button', 'data-event': 'party' }

describe('insertEmbedElement', () => {
  it('puts the element after the selected element and sets its attributes', async () => {
    const created = fakeDomElement()
    const selected = { type: 'Block', children: true, after: vi.fn(async () => created) }

    expect(await insertEmbedElement(fakeApi(selected), attributes)).toBe(created)
    expect(selected.after).toHaveBeenCalledWith('DOM preset')
    expect(created.setTag).toHaveBeenCalledWith('div')
    expect(created.setAttribute.mock.calls).toEqual([
      ['data-ttf-embed', 'button'],
      ['data-event', 'party'],
    ])
    expect(created.setDisplayName).toHaveBeenCalledWith(ELEMENT_NAME)
  })

  it('puts the element inside a selected page body', async () => {
    const created = fakeDomElement()
    const body = { type: 'Body', children: true, after: vi.fn(), append: vi.fn(async () => created) }

    await insertEmbedElement(fakeApi(body), attributes)
    expect(body.append).toHaveBeenCalledWith('DOM preset')
    expect(body.after).not.toHaveBeenCalled()
  })

  it('adds to the end of the page when nothing is selected', async () => {
    const created = fakeDomElement()
    const root = { type: 'Body', children: true, append: vi.fn(async () => created) }

    await insertEmbedElement(fakeApi(null, root), attributes)
    expect(root.append).toHaveBeenCalledWith('DOM preset')
  })

  it('reports a page with nowhere to put the element', async () => {
    await expect(insertEmbedElement(fakeApi(null, null), attributes)).rejects.toMatchObject({
      cause: { tag: 'InvalidTargetElement' },
    })
  })

  it('removes a half-made element when setting it up fails', async () => {
    const created = fakeDomElement()
    created.setAttribute.mockRejectedValueOnce(new Error('boom'))
    const selected = { type: 'Block', after: vi.fn(async () => created) }

    await expect(insertEmbedElement(fakeApi(selected), attributes)).rejects.toThrow('boom')
    expect(created.remove).toHaveBeenCalled()
  })
})

describe('insertErrorMessage', () => {
  const withTag = (tag: string) => Object.assign(new Error('x'), { cause: { tag } })

  it.each([
    ['ModeForbidden', /Design mode/],
    ['Forbidden', /Design mode/],
    ['InvalidElementPlacement', /can't go there/],
    ['InvalidTargetElement', /can't go there/],
    ['ResourceMissing', /no longer on the page/],
    ['InternalError', /couldn't add the tickets/],
  ])('explains %s', (tag, message) => {
    expect(insertErrorMessage(withTag(tag))).toMatch(message)
  })

  it('handles errors without a tag', () => {
    expect(insertErrorMessage(null)).toMatch(/couldn't add the tickets/)
    expect(insertErrorMessage('oops')).toMatch(/couldn't add the tickets/)
  })
})

describe('loader setup confirmation', () => {
  const memoryStorage = () => {
    const values = new Map<string, string>()
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => void values.set(key, value),
      removeItem: (key: string) => void values.delete(key),
    }

    return () => storage
  }

  it('is remembered per site', () => {
    const storage = memoryStorage()
    setLoaderConfirmed('site-a', true, storage)

    expect(isLoaderConfirmed('site-a', storage)).toBe(true)
    expect(isLoaderConfirmed('site-b', storage)).toBe(false)

    setLoaderConfirmed('site-a', false, storage)
    expect(isLoaderConfirmed('site-a', storage)).toBe(false)
  })

  it('falls back to showing the step when storage is blocked', () => {
    const blocked = () => {
      throw new Error('SecurityError')
    }

    expect(isLoaderConfirmed('site-a', blocked)).toBe(false)
    expect(() => setLoaderConfirmed('site-a', true, blocked)).not.toThrow()
  })
})
