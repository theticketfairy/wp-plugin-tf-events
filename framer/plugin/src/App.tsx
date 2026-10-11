import { framer, useIsAllowedTo } from '@framer/plugin'
import { LINK_PROBLEMS, SHOW_LABELS } from '@ticketfairy/framer-component/settings'
import { describeEvent, type EmbedType, parseTicketFairyLink } from '@ticketfairy/site-embed-core'
import { useEffect, useState } from 'react'

import { buildControls, COMPONENT_URL, EVENT_SHOW_OPTIONS, EVENTS_PROBLEMS } from './controls'
import { useBrandEvents } from './useBrandEvents'

void framer.showUI({
  position: 'top right',
  width: 300,
  height: 520,
  minHeight: 320,
  resizable: 'height',
})

// Wait for a pause in typing, so a brand link entered by hand does not ask
// for the event list of every partial brand name.
const TYPING_PAUSE_MS = 400

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)

    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}

export function App() {
  const [linkText, setLinkText] = useState('')
  const [chosenEventSlug, setChosenEventSlug] = useState<string | null>(null)
  const [show, setShow] = useState<EmbedType>('button')
  const [buttonText, setButtonText] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const canAdd = useIsAllowedTo('addComponentInstance')

  const link = parseTicketFairyLink(linkText)
  const typedBrandSlug = link.kind === 'brand' ? link.brandSlug : null
  const brandSlug = useDebouncedValue(typedBrandSlug, TYPING_PAUSE_MS)
  const brandEvents = useBrandEvents(brandSlug)
  // During the typing pause the list still belongs to the previous link, so
  // its events must not be offered for the new one.
  const listIsForThisLink = brandSlug === typedBrandSlug
  const controls = buildControls({ link, chosenEventSlug, show, buttonText })
  const showsOneEvent = link.kind === 'event' || (link.kind === 'brand' && chosenEventSlug !== null)
  const isBrandMissing =
    link.kind === 'brand' && listIsForThisLink && brandEvents.problem === EVENTS_PROBLEMS.brandNotFound

  const changeLink = (text: string) => {
    setLinkText(text)
    setChosenEventSlug(null)
  }

  const addToPage = async () => {
    if (!controls) {
      return
    }

    setIsAdding(true)

    try {
      await framer.addComponentInstance({ url: COMPONENT_URL, attributes: { controls: { ...controls } } })
      framer.notify('Tickets added to the page. Publish your site to sell tickets.', { variant: 'success' })
    } catch {
      framer.notify("We couldn't add the tickets to the page. Try again.", { variant: 'error' })
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <main>
      <label className="field">
        <span className="field-title">Ticket Fairy link</span>
        <input
          type="url"
          value={linkText}
          placeholder="https://www.ticketfairy.com/event/…"
          onChange={(event) => changeLink(event.target.value)}
          autoFocus
        />
        {link.kind === 'invalid' && link.reason !== 'empty' ? (
          <span className="message problem">{LINK_PROBLEMS[link.reason]}</span>
        ) : (
          <span className="message">Paste the link to your event page, or to your brand page.</span>
        )}
      </label>

      {link.kind === 'brand' && (
        <section className="field">
          <span className="field-title">Which events?</span>
          <div className="event-list" role="listbox" aria-label="Which events?">
            {!isBrandMissing && (
              <EventOption
                title="All upcoming events"
                detail="An event list that stays up to date."
                isChosen={chosenEventSlug === null}
                onChoose={() => setChosenEventSlug(null)}
              />
            )}
            {!listIsForThisLink && <p className="message">Loading your events…</p>}
            {listIsForThisLink &&
              brandEvents.events.map((event) => (
                <EventOption
                  key={event.eventSlug}
                  title={event.name}
                  detail={[describeEvent(event), event.soldOut ? 'Sold out' : ''].filter(Boolean).join(' · ')}
                  isChosen={chosenEventSlug === event.eventSlug}
                  onChoose={() => setChosenEventSlug(event.eventSlug)}
                />
              ))}
            {listIsForThisLink && brandEvents.isLoading && <p className="message">Loading your events…</p>}
            {listIsForThisLink &&
              !brandEvents.isLoading &&
              !brandEvents.problem &&
              brandEvents.events.length === 0 && (
                <p className="message">
                  No upcoming events yet. You can still add the event list. It shows events once they are on
                  sale.
                </p>
              )}
            {listIsForThisLink && brandEvents.problem && (
              <div className="message problem">
                <p>{brandEvents.problem}</p>
                <button onClick={brandEvents.tryAgain}>Try again</button>
              </div>
            )}
            {brandEvents.hasMore && !brandEvents.isLoading && !brandEvents.problem && (
              <button onClick={brandEvents.showMore}>Show more events</button>
            )}
          </div>
        </section>
      )}

      {showsOneEvent && (
        <label className="field">
          <span className="field-title">What to show</span>
          <select value={show} onChange={(event) => setShow(event.target.value as EmbedType)}>
            {EVENT_SHOW_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {SHOW_LABELS[option]}
              </option>
            ))}
          </select>
          {link.kind === 'event' && (
            <span className="message">To show all your events, paste your brand page link instead.</span>
          )}
        </label>
      )}

      {showsOneEvent && show === 'button' && (
        <label className="field">
          <span className="field-title">Button text</span>
          <input
            value={buttonText}
            placeholder="Buy tickets"
            onChange={(event) => setButtonText(event.target.value)}
          />
        </label>
      )}

      <footer>
        {!canAdd && <p className="message">Ask the project owner for edit access to add tickets.</p>}
        <button
          className="framer-button-primary"
          disabled={!controls || isBrandMissing || !canAdd || isAdding}
          onClick={addToPage}
        >
          {isAdding ? 'Adding…' : 'Add to page'}
        </button>
        <p className="message">You can change these settings later in the right-hand panel.</p>
      </footer>
    </main>
  )
}

interface EventOptionProps {
  title: string
  detail: string
  isChosen: boolean
  onChoose: () => void
}

function EventOption({ title, detail, isChosen, onChoose }: EventOptionProps) {
  return (
    <button className="event-option" role="option" aria-selected={isChosen} onClick={onChoose}>
      <span className="event-name">{title}</span>
      {detail && <span className="event-detail">{detail}</span>}
    </button>
  )
}
