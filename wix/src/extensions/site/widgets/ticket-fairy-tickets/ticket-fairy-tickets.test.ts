import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LOADER_URL } from '@ticketfairy/site-embed-core'

const viewMode = vi.fn<() => Promise<string>>()

vi.mock('@wix/site-window', () => ({ window: { viewMode: () => viewMode() } }))

const EVENT_LINK = 'https://www.ticketfairy.com/event/renaissance'

// Each test loads a fresh module, because the element remembers the view mode.
const mountWidget = async (attributes: Record<string, string>) => {
  vi.resetModules()
  const { default: TicketFairyTickets } = await import('./ticket-fairy-tickets')
  const tagName = `ticket-fairy-tickets-${Math.random().toString(36).slice(2)}`
  customElements.define(tagName, TicketFairyTickets)

  const element = document.createElement(tagName)

  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, value)
  }

  document.body.appendChild(element)
  await vi.waitFor(() => expect(element.childElementCount).toBeGreaterThan(0))

  return element
}

describe('ticket-fairy-tickets', () => {
  beforeEach(() => {
    viewMode.mockResolvedValue('Site')
  })

  afterEach(() => {
    document.body.replaceChildren()
    delete window.TTFEmbed
  })

  it('places the embed in its light DOM and loads the loader once', async () => {
    const element = await mountWidget({ link: EVENT_LINK, 'button-text': 'Get tickets' })
    const placeholder = element.querySelector('[data-ttf-embed]')

    expect(element.shadowRoot).toBeNull()
    expect(placeholder?.getAttribute('data-ttf-embed')).toBe('button')
    expect(placeholder?.getAttribute('data-event')).toBe('renaissance')
    expect(placeholder?.getAttribute('data-label')).toBe('Get tickets')
    expect(document.querySelectorAll(`script[src="${LOADER_URL}"]`)).toHaveLength(1)
  })

  it('replaces the placeholder when a setting changes, and asks the loader to scan', async () => {
    const element = await mountWidget({ link: EVENT_LINK })
    const scan = vi.fn()
    window.TTFEmbed = { scan }
    const first = element.firstElementChild

    element.setAttribute('show', 'checkout')
    await vi.waitFor(() => expect(element.firstElementChild).not.toBe(first))

    expect(element.firstElementChild?.getAttribute('data-ttf-embed')).toBe('checkout')
    expect(scan).toHaveBeenCalledTimes(1)
  })

  it('keeps the placeholder when a change does not affect it', async () => {
    const element = await mountWidget({ link: EVENT_LINK })
    const first = element.firstElementChild

    element.setAttribute('event-name', 'Renaissance')
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(element.firstElementChild).toBe(first)
  })

  it('shows a preview card in the editor instead of the live embed', async () => {
    viewMode.mockResolvedValue('Editor')
    const element = await mountWidget({})

    expect(element.querySelector('[data-ttf-embed]')).toBeNull()
    expect(element.textContent).toContain('Open Settings and paste your Ticket Fairy link.')
  })

  it('shows the live embed when the view mode is not available', async () => {
    viewMode.mockRejectedValue(new Error('blocked'))
    const element = await mountWidget({ link: EVENT_LINK })

    expect(element.querySelector('[data-ttf-embed="button"]')).not.toBeNull()
  })
})
