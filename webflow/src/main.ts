import {
  BrandNotFoundError,
  LOADER_SCRIPT_HTML,
  describeEvent,
  embedAttributes,
  fetchBrandEvents,
  isEmbedType,
  parseTicketFairyLink,
  type BrandEvent,
  type EmbedType,
} from '@ticketfairy/site-embed-core'
import { SHOW_OPTIONS, embedSettingsFor, linkProblem, needsEventPicker, widgetKeyProblem } from './choices'
import { insertEmbedElement, insertErrorMessage } from './insert'
import { isLoaderConfirmed, setLoaderConfirmed } from './setup'

const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T

const form = byId<HTMLFormElement>('embed-form')
const linkInput = byId<HTMLInputElement>('link')
const linkProblemText = byId<HTMLElement>('link-problem')
const typeSelect = byId<HTMLSelectElement>('type')
const eventPicker = byId<HTMLElement>('event-picker')
const eventList = byId<HTMLElement>('event-list')
const eventsStatus = byId<HTMLElement>('events-status')
const retryButton = byId<HTMLButtonElement>('retry-events')
const moreButton = byId<HTMLButtonElement>('more-events')
const buttonLabelField = byId<HTMLElement>('button-label-field')
const buttonLabelInput = byId<HTMLInputElement>('button-label')
const widgetKeyInput = byId<HTMLInputElement>('widget-key')
const widgetKeyProblemText = byId<HTMLElement>('widget-key-problem')
const addButton = byId<HTMLButtonElement>('add')
const addResult = byId<HTMLElement>('add-result')
const setup = byId<HTMLDetailsElement>('setup')
const setupSummary = byId<HTMLElement>('setup-summary')
const loaderLine = byId<HTMLInputElement>('loader-line')
const copyButton = byId<HTMLButtonElement>('copy')
const setupDone = byId<HTMLInputElement>('setup-done')

// A pasted link fills the field at once; typing changes it per key. Waiting
// briefly keeps typing from starting one event list request per letter.
const LINK_SETTLE_MS = 300

interface EventListState {
  brandSlug: string
  events: BrandEvent[]
  nextPage: number
  hasMore: boolean
  // `missing` means the brand page does not exist; `error` means the request failed.
  status: 'loading' | 'ready' | 'error' | 'missing'
}

const BRAND_MISSING = "We couldn't find that brand page. Check the link and try again."

let link = parseTicketFairyLink('')
let pickedEventSlug: string | undefined
let eventListState: EventListState | null = null
let eventsRequest: AbortController | null = null
let linkSettleTimer: number | undefined
let isAdding = false
let siteId: string | null = null

function selectedType(): EmbedType {
  return isEmbedType(typeSelect.value) ? typeSelect.value : 'button'
}

function currentAttributes(): Record<string, string> | null {
  const settings = embedSettingsFor({
    link,
    type: selectedType(),
    pickedEventSlug,
    buttonLabel: buttonLabelInput.value,
    widgetKey: widgetKeyInput.value,
  })

  return embedAttributes(settings)
}

function showText(element: HTMLElement, text: string | null): void {
  element.textContent = text ?? ''
  element.hidden = !text
}

function renderEventList(): void {
  const state = eventListState

  eventList.replaceChildren(
    ...(state?.events ?? []).map((event) => {
      const row = document.createElement('label')
      row.className = 'event'

      const radio = document.createElement('input')
      radio.type = 'radio'
      radio.name = 'event'
      radio.value = event.eventSlug
      radio.checked = event.eventSlug === pickedEventSlug

      const text = document.createElement('span')
      const name = document.createElement('span')
      name.className = 'event-name'
      name.textContent = event.name

      if (event.soldOut) {
        const soldOut = document.createElement('span')
        soldOut.className = 'sold-out'
        soldOut.textContent = 'Sold out'
        name.append(soldOut)
      }

      const details = document.createElement('span')
      details.className = 'hint'
      details.textContent = describeEvent(event)
      text.append(name, details)
      row.append(radio, text)

      return row
    })
  )

  // The link field shows the missing-brand problem, so the picker stays quiet about it.
  const statusText = {
    loading: 'Loading events…',
    error: "We couldn't load the events. Check your internet connection and try again.",
    missing: null,
    ready: state?.events.length ? null : 'This brand has no upcoming events on sale.',
  }[state?.status ?? 'missing']

  showText(eventsStatus, statusText)
  retryButton.hidden = state?.status !== 'error'
  moreButton.hidden = !(state?.status === 'ready' && state.hasMore)
}

async function loadEvents(brandSlug: string, page: number): Promise<void> {
  eventsRequest?.abort()
  const request = new AbortController()
  eventsRequest = request

  const previous = eventListState?.brandSlug === brandSlug ? eventListState.events : []
  eventListState = { brandSlug, events: previous, nextPage: page, hasMore: false, status: 'loading' }
  renderEventList()

  try {
    const result = await fetchBrandEvents(brandSlug, { page, signal: request.signal })
    eventListState = {
      brandSlug,
      events: [...previous, ...result.events],
      nextPage: page + 1,
      hasMore: result.hasMore,
      status: 'ready',
    }
  } catch (error) {
    if (request.signal.aborted) {
      return
    }

    const status = error instanceof BrandNotFoundError ? 'missing' : 'error'
    eventListState = { brandSlug, events: previous, nextPage: page, hasMore: false, status }
  }

  renderEventList()
  update()
}

function update(): void {
  const type = selectedType()
  const attributes = currentAttributes()
  const brandMissing = eventListState?.status === 'missing'

  showText(linkProblemText, brandMissing ? BRAND_MISSING : linkProblem(link, type))
  showText(widgetKeyProblemText, widgetKeyProblem(widgetKeyInput.value, attributes))
  eventPicker.hidden = brandMissing || !needsEventPicker(link, type)
  buttonLabelField.hidden = type !== 'button'
  addButton.disabled = isAdding || brandMissing || !attributes
}

function onLinkChanged(): void {
  const nextLink = parseTicketFairyLink(linkInput.value)
  const brandChanged =
    (nextLink.kind === 'brand' ? nextLink.brandSlug : null) !==
    (link.kind === 'brand' ? link.brandSlug : null)

  link = nextLink
  update()

  if (!brandChanged) {
    return
  }

  pickedEventSlug = undefined
  eventsRequest?.abort()
  eventListState = null
  renderEventList()
  // The earlier update() still saw the old brand's result, such as a missing
  // brand page that disabled Add.
  update()
  window.clearTimeout(linkSettleTimer)

  if (nextLink.kind === 'brand') {
    linkSettleTimer = window.setTimeout(() => loadEvents(nextLink.brandSlug, 1), LINK_SETTLE_MS)
  }
}

async function copyLoaderLine(): Promise<void> {
  loaderLine.select()

  try {
    await navigator.clipboard.writeText(LOADER_SCRIPT_HTML)
  } catch {
    // The Designer runs extensions in a frame that may block the clipboard API.
    if (!document.execCommand('copy')) {
      copyButton.textContent = 'Select the line and copy it'

      return
    }
  }

  copyButton.textContent = 'Copied'
}

function renderSetup(confirmed: boolean): void {
  setupDone.checked = confirmed
  setupSummary.textContent = confirmed ? 'Site setup: done' : 'One last step, only once per site'
}

async function addToPage(): Promise<void> {
  const attributes = currentAttributes()

  if (!attributes) {
    return
  }

  isAdding = true
  update()
  addResult.className = ''
  addResult.textContent = 'Adding…'

  try {
    const element = await insertEmbedElement(webflow, attributes)
    // Selecting it shows the organiser where it went; failing to select is harmless.
    await webflow.setSelectedElement(element).catch(() => null)
    addResult.className = 'is-success'
    addResult.textContent = 'Added to your page. Publish your site to see it.'

    if (!setupDone.checked) {
      setup.open = true
    }
  } catch (error) {
    addResult.className = 'is-problem'
    addResult.textContent = insertErrorMessage(error)
  } finally {
    isAdding = false
    update()
  }
}

typeSelect.append(...SHOW_OPTIONS.map(({ type, label }) => new Option(label, type)))
loaderLine.value = LOADER_SCRIPT_HTML

linkInput.addEventListener('input', onLinkChanged)
typeSelect.addEventListener('change', update)
buttonLabelInput.addEventListener('input', update)
widgetKeyInput.addEventListener('input', update)
eventList.addEventListener('change', (event) => {
  pickedEventSlug = (event.target as HTMLInputElement).value
  update()
})
const loadNextPage = () => {
  if (eventListState) {
    loadEvents(eventListState.brandSlug, eventListState.nextPage)
  }
}
retryButton.addEventListener('click', loadNextPage)
moreButton.addEventListener('click', loadNextPage)
form.addEventListener('submit', (event) => {
  event.preventDefault()
  addToPage()
})
copyButton.addEventListener('click', copyLoaderLine)
setupDone.addEventListener('change', () => {
  if (siteId) {
    setLoaderConfirmed(siteId, setupDone.checked)
  }

  renderSetup(setupDone.checked)
  setup.open = !setupDone.checked
})

renderSetup(false)
setup.open = true
update()

webflow
  .getSiteInfo()
  .then((site) => {
    siteId = site.siteId
    const confirmed = isLoaderConfirmed(siteId)
    renderSetup(confirmed)
    setup.open = !confirmed
  })
  .catch(() => null)
