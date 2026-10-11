import { type BrandEvent, fetchBrandEvents } from '@ticketfairy/site-embed-core'
import { useEffect, useState } from 'react'

import { eventsProblem } from './controls'

interface Request {
  brandSlug: string | null
  page: number
  /** Changes on "Try again", so the same page is requested again. */
  attempt: number
}

export interface BrandEventsState {
  events: BrandEvent[]
  hasMore: boolean
  isLoading: boolean
  problem: string | null
  showMore: () => void
  tryAgain: () => void
}

/** Loads a brand's upcoming events one page at a time, for the event picker. */
export function useBrandEvents(brandSlug: string | null): BrandEventsState {
  const [request, setRequest] = useState<Request>({ brandSlug, page: 1, attempt: 0 })
  const [events, setEvents] = useState<BrandEvent[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [isLoading, setIsLoading] = useState(brandSlug !== null)
  const [problem, setProblem] = useState<string | null>(null)

  // A different brand starts again from the first page. Resetting during
  // render keeps the old brand's events off the panel for even one frame.
  if (request.brandSlug !== brandSlug) {
    setRequest({ brandSlug, page: 1, attempt: 0 })
    setEvents([])
    setHasMore(false)
    setIsLoading(brandSlug !== null)
    setProblem(null)
  }

  useEffect(() => {
    if (!request.brandSlug) {
      return
    }

    const controller = new AbortController()

    setIsLoading(true)
    setProblem(null)

    fetchBrandEvents(request.brandSlug, { page: request.page, signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted) {
          return
        }
        setEvents((previous) => (request.page === 1 ? result.events : [...previous, ...result.events]))
        setHasMore(result.hasMore)
        setIsLoading(false)
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return
        }
        setProblem(eventsProblem(error))
        setIsLoading(false)
      })

    // A newer request replaces this one, so its late answer must not be shown.
    return () => controller.abort()
  }, [request])

  return {
    events,
    hasMore,
    isLoading,
    problem,
    showMore: () => setRequest((current) => ({ ...current, page: current.page + 1 })),
    tryAgain: () => setRequest((current) => ({ ...current, attempt: current.attempt + 1 })),
  }
}
