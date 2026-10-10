/**
 * Remembers, per Webflow site, that the organiser pasted the loader line into
 * the site's footer code. This is only a convenience that folds the setup step
 * away, so every storage failure (private window, blocked storage) falls back
 * to showing the step again.
 */

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

const defaultStorage = (): StorageLike => window.localStorage

const keyFor = (siteId: string) => `ttf-loader-added:${siteId}`

export function isLoaderConfirmed(siteId: string, storage: () => StorageLike = defaultStorage): boolean {
  try {
    return storage().getItem(keyFor(siteId)) === '1'
  } catch {
    return false
  }
}

export function setLoaderConfirmed(
  siteId: string,
  confirmed: boolean,
  storage: () => StorageLike = defaultStorage
): void {
  try {
    if (confirmed) {
      storage().setItem(keyFor(siteId), '1')
    } else {
      storage().removeItem(keyFor(siteId))
    }
  } catch {
    // The checkbox still works for this session.
  }
}
