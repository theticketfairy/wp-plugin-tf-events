/**
 * Lists a brand's upcoming events so the organiser can pick one, page by page.
 */
import React, { useEffect, useState, type FC } from 'react'
import {
  BrandNotFoundError,
  describeEvent,
  fetchBrandEvents,
  type BrandEvent,
} from '@ticketfairy/site-embed-core'
import { Box, Loader, RadioGroup, SectionHelper, Text, TextButton } from '@wix/design-system'

interface EventPickerProps {
  brandSlug: string
  chosenEventSlug: string
  chosenEventName: string
  onChoose: (event: BrandEvent) => void
}

type LoadState = 'loading' | 'loaded' | 'brand-not-found' | 'failed'

export const EventPicker: FC<EventPickerProps> = ({
  brandSlug,
  chosenEventSlug,
  chosenEventName,
  onChoose,
}) => {
  const [events, setEvents] = useState<BrandEvent[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [attempt, setAttempt] = useState(0)

  // The panel gives each brand its own picker (React key), so the pages
  // loaded here always belong to `brandSlug`.
  useEffect(() => {
    const controller = new AbortController()
    setLoadState('loading')

    fetchBrandEvents(brandSlug, { page, signal: controller.signal })
      .then((result) => {
        setEvents((previous) => (page === 1 ? result.events : [...previous, ...result.events]))
        setHasMore(result.hasMore)
        setLoadState('loaded')
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return
        }

        setLoadState(error instanceof BrandNotFoundError ? 'brand-not-found' : 'failed')
      })

    return () => controller.abort()
  }, [brandSlug, page, attempt])

  if (loadState === 'brand-not-found') {
    return (
      <SectionHelper skin="danger">
        We couldn't find that brand page. Check the link and try again.
      </SectionHelper>
    )
  }

  const chosenIsListed = events.some((event) => event.eventSlug === chosenEventSlug)

  const chooseBySlug = (slug: unknown) => {
    const event = events.find((candidate) => candidate.eventSlug === slug)

    if (event) {
      onChoose(event)
    }
  }

  return (
    <Box direction="vertical" gap="SP2">
      {chosenEventSlug && !chosenIsListed && (
        <Text size="small" secondary>
          Chosen event: {chosenEventName || chosenEventSlug}
        </Text>
      )}

      {events.length > 0 && (
        <RadioGroup value={chosenEventSlug} onChange={chooseBySlug}>
          {events.map((event) => (
            <RadioGroup.Radio key={event.eventSlug} value={event.eventSlug}>
              <Box direction="vertical">
                <Text size="small">{event.soldOut ? `${event.name} (sold out)` : event.name}</Text>
                <Text size="tiny" secondary>
                  {describeEvent(event)}
                </Text>
              </Box>
            </RadioGroup.Radio>
          ))}
        </RadioGroup>
      )}

      {loadState === 'loaded' && events.length === 0 && (
        <Text size="small" secondary>
          This brand has no upcoming events on sale.
        </Text>
      )}

      {loadState === 'loading' && (
        <Box align="center" padding="SP2">
          <Loader size="small" />
        </Box>
      )}

      {loadState === 'failed' && (
        <SectionHelper skin="danger" actionText="Try again" onAction={() => setAttempt((count) => count + 1)}>
          We couldn't load your events. Check your internet connection and try again.
        </SectionHelper>
      )}

      {loadState === 'loaded' && hasMore && (
        <TextButton size="small" onClick={() => setPage((current) => current + 1)}>
          Show more events
        </TextButton>
      )}
    </Box>
  )
}
