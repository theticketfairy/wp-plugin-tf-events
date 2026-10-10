/**
 * Block editor side of the Ticket Fairy Tickets block.
 *
 * The block is rendered by PHP on the live site (includes/class-embed.php).
 * In the editor it shows a card that says what visitors will see, because the
 * live checkout does not belong inside the editor canvas.
 *
 * WordPress provides React and its components as globals (`wp.*`), so this
 * bundle only contains our own code and packages/core.
 */

import {
  EVENTS_PER_PAGE,
  BrandNotFoundError,
  brandPageUrl,
  describeEvent,
  eventPageUrl,
  fetchBrandEvents,
  linkKindFor,
  parseTicketFairyLink,
  type BrandEvent,
  type EmbedType,
} from '@ticketfairy/site-embed-core'
import { blockVariations, showOptions, typeLabel } from './labels'

declare const wp: any

const { registerBlockType } = wp.blocks
const { useBlockProps, InspectorControls } = wp.blockEditor
const { PanelBody, TextControl, SelectControl, Button, Notice, Spinner, Placeholder, ExternalLink } =
  wp.components
const { useEffect, useState } = wp.element
const { __, sprintf } = wp.i18n

interface Attributes {
  link: string
  show: EmbedType
  event: string
  label: string
  embedKey: string
}

interface EditProps {
  attributes: Attributes
  setAttributes: (next: Partial<Attributes>) => void
}

type EventsState =
  | { status: 'idle' }
  | { status: 'loading'; events: BrandEvent[] }
  | { status: 'ready'; events: BrandEvent[]; hasMore: boolean; page: number }
  | { status: 'error'; brandMissing: boolean }

const useBrandEvents = (brandSlug: string | null): [EventsState, () => void, () => void] => {
  const [state, setState] = useState({ status: 'idle' } as EventsState)
  const [page, setPage] = useState(1)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!brandSlug) {
      setState({ status: 'idle' })

      return undefined
    }

    // Abort the request for a link the organiser has already changed.
    const controller = new AbortController()
    const earlier = page > 1 && state.status === 'ready' ? state.events : []
    setState({ status: 'loading', events: earlier })

    fetchBrandEvents(brandSlug, { page, signal: controller.signal })
      .then(({ events, hasMore }) =>
        setState({ status: 'ready', events: [...earlier, ...events], hasMore, page })
      )
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setState({ status: 'error', brandMissing: error instanceof BrandNotFoundError })
        }
      })

    return () => controller.abort()
  }, [brandSlug, page, attempt])

  const showMore = () => setPage((current: number) => current + 1)
  // Start again from the first page, so no loaded events are lost or repeated.
  const retry = () => {
    setPage(1)
    setAttempt((current: number) => current + 1)
  }

  return [state, showMore, retry]
}

const linkProblem = (link: string, show: EmbedType): string | null => {
  const parsed = parseTicketFairyLink(link)

  if (parsed.kind === 'invalid') {
    if (parsed.reason === 'empty') {
      return null
    }

    return parsed.reason === 'not-ticket-fairy'
      ? __(
          "That isn't a Ticket Fairy link. Copy the link from your event page or brand page.",
          'ticket-fairy-events'
        )
      : __(
          "That link doesn't open an event page or a brand page. Copy the link from your event page or brand page.",
          'ticket-fairy-events'
        )
  }

  if (linkKindFor(show) === 'brand' && parsed.kind !== 'brand') {
    return __(
      'To show all your events, enter your brand page link. It looks like ticketfairy.com/events/your-brand.',
      'ticket-fairy-events'
    )
  }

  return null
}

const EventPicker = ({
  brandSlug,
  value,
  onChange,
}: {
  brandSlug: string
  value: string
  onChange: (slug: string) => void
}) => {
  const [state, showMore, retry] = useBrandEvents(brandSlug)

  if (state.status === 'error') {
    return (
      <Notice status="error" isDismissible={false}>
        {state.brandMissing
          ? __("We couldn't find that brand page. Check the link and try again.", 'ticket-fairy-events')
          : __(
              "We couldn't load your events. Check your connection and try again.",
              'ticket-fairy-events'
            )}{' '}
        {!state.brandMissing && (
          <Button variant="link" onClick={retry}>
            {__('Try again', 'ticket-fairy-events')}
          </Button>
        )}
      </Notice>
    )
  }

  const events = state.status === 'idle' ? [] : state.events
  const selected = events.find((event) => event.eventSlug === value)

  if (state.status === 'ready' && events.length === 0) {
    return <p>{__('This brand has no upcoming events on sale.', 'ticket-fairy-events')}</p>
  }

  return (
    <div className="ticket-fairy-event-picker">
      <SelectControl
        label={__('Event', 'ticket-fairy-events')}
        value={value}
        onChange={onChange}
        options={[
          { value: '', label: __('Choose an event', 'ticket-fairy-events') },
          ...events.map((event) => ({ value: event.eventSlug, label: event.name })),
        ]}
        help={selected ? describeEvent(selected) : undefined}
        __nextHasNoMarginBottom
      />
      {state.status === 'loading' && <Spinner />}
      {state.status === 'ready' && state.hasMore && events.length >= EVENTS_PER_PAGE && (
        <Button variant="link" onClick={showMore}>
          {__('Show more events', 'ticket-fairy-events')}
        </Button>
      )}
    </div>
  )
}

const previewText = ({ show, link, event, label }: Attributes): string | null => {
  const parsed = parseTicketFairyLink(link)

  if (parsed.kind === 'invalid' || linkProblem(link, show)) {
    return null
  }

  if (show === 'listing') {
    return __('Your upcoming events, with tickets on sale on this page.', 'ticket-fairy-events')
  }

  const eventSlug = parsed.kind === 'event' ? parsed.eventSlug : event

  if (!eventSlug) {
    return null
  }

  // The link the organiser knows, not an internal name.
  const eventLink = `ticketfairy.com/event/${eventSlug}`

  if (show === 'button') {
    return sprintf(
      /* translators: 1: text on the button, 2: event page link */
      __('A "%1$s" button for %2$s.', 'ticket-fairy-events'),
      label || __('Buy tickets', 'ticket-fairy-events'),
      eventLink
    )
  }

  /* translators: 1: what will show, such as "Checkout on the page", 2: event page link */
  return sprintf(__('%1$s for %2$s.', 'ticket-fairy-events'), typeLabel(show), eventLink)
}

const Edit = ({ attributes, setAttributes }: EditProps) => {
  const { link, show, event, label, embedKey } = attributes
  const blockProps = useBlockProps()
  const parsed = parseTicketFairyLink(link)
  const problem = linkProblem(link, show)
  const needsEventChoice = !problem && parsed.kind === 'brand' && show !== 'listing'
  const preview = previewText(attributes)
  // Built from the parsed link, never the raw text, so the link always opens ticketfairy.com.
  const pageLink =
    parsed.kind === 'event'
      ? eventPageUrl(parsed.eventSlug)
      : parsed.kind === 'brand'
        ? brandPageUrl(parsed.brandSlug)
        : null

  const linkField = (
    <TextControl
      label={__('Ticket Fairy link', 'ticket-fairy-events')}
      help={__(
        'Enter your event page link, or your brand page link to choose from your events.',
        'ticket-fairy-events'
      )}
      value={link}
      placeholder="https://www.ticketfairy.com/event/…"
      onChange={(next: string) => setAttributes({ link: next, event: '' })}
      __nextHasNoMarginBottom
    />
  )

  const settings = (
    <InspectorControls>
      <PanelBody title={__('Tickets', 'ticket-fairy-events')}>
        {linkField}
        {problem && (
          <Notice status="warning" isDismissible={false}>
            {problem}
          </Notice>
        )}
        <SelectControl
          label={__('What to show', 'ticket-fairy-events')}
          value={show}
          options={showOptions()}
          onChange={(next: EmbedType) => setAttributes({ show: next })}
          __nextHasNoMarginBottom
        />
        {needsEventChoice && parsed.kind === 'brand' && (
          <EventPicker
            key={parsed.brandSlug}
            brandSlug={parsed.brandSlug}
            value={event}
            onChange={(next) => setAttributes({ event: next })}
          />
        )}
        {show === 'button' && (
          <TextControl
            label={__('Button text', 'ticket-fairy-events')}
            value={label}
            placeholder={__('Buy tickets', 'ticket-fairy-events')}
            onChange={(next: string) => setAttributes({ label: next })}
            __nextHasNoMarginBottom
          />
        )}
      </PanelBody>
    </InspectorControls>
  )

  // WordPress already shows an "Advanced" section, so the embed key joins it
  // instead of adding a second section with the same name.
  const advancedSettings = (
    <InspectorControls group="advanced">
      <TextControl
        label={__('Embed key (optional)', 'ticket-fairy-events')}
        help={__(
          'From Embed on your website in your Ticket Fairy dashboard. Only needed for saved colours and allowed websites.',
          'ticket-fairy-events'
        )}
        value={embedKey}
        onChange={(next: string) => setAttributes({ embedKey: next.trim() })}
        __nextHasNoMarginBottom
      />
    </InspectorControls>
  )

  if (!preview) {
    return (
      <div {...blockProps}>
        {settings}
        {advancedSettings}
        <Placeholder
          icon="tickets-alt"
          label={__('Ticket Fairy Tickets', 'ticket-fairy-events')}
          instructions={
            needsEventChoice
              ? __('Choose an event in the block settings.', 'ticket-fairy-events')
              : __(
                  'Enter the link to your Ticket Fairy event page or brand page. You can copy it from your browser when you view the page.',
                  'ticket-fairy-events'
                )
          }
        >
          {needsEventChoice && parsed.kind === 'brand' ? (
            <EventPicker
              key={parsed.brandSlug}
              brandSlug={parsed.brandSlug}
              value={event}
              onChange={(next) => setAttributes({ event: next })}
            />
          ) : (
            <div className="ticket-fairy-placeholder-fields">
              {linkField}
              {problem && (
                <Notice status="warning" isDismissible={false}>
                  {problem}
                </Notice>
              )}
            </div>
          )}
        </Placeholder>
      </div>
    )
  }

  return (
    <div {...blockProps}>
      {settings}
      {advancedSettings}
      <div className="ticket-fairy-preview">
        <strong>{__('Ticket Fairy Tickets', 'ticket-fairy-events')}</strong>
        <p>{preview}</p>
        <p className="ticket-fairy-preview__hint">
          {__('Visitors see the live tickets when you preview or publish the page.', 'ticket-fairy-events')}{' '}
          {pageLink && (
            <ExternalLink href={pageLink}>
              {__('Open your Ticket Fairy page', 'ticket-fairy-events')}
            </ExternalLink>
          )}
        </p>
      </div>
    </div>
  )
}

registerBlockType('ticket-fairy/tickets', {
  edit: Edit,
  // Rendered by PHP, so the saved post holds only the block's settings.
  save: () => null,
  variations: blockVariations(),
})
