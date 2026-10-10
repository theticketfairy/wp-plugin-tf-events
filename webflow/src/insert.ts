/**
 * Puts the Ticket Fairy element on the Webflow page.
 *
 * Uses the Designer API "DOM" preset (Webflow's custom element), because it is
 * the only element that takes any tag and any attribute. The embed loader on
 * the published site turns it into the button, checkout, list or line-up.
 */

export type DesignerApi = Pick<typeof webflow, 'getSelectedElement' | 'getRootElement' | 'elementPresets'>

export const ELEMENT_NAME = 'Ticket Fairy tickets'

class NoPlaceForElementError extends Error {
  readonly cause = { tag: 'InvalidTargetElement' }
}

async function addEmptyElement(api: DesignerApi): Promise<DOMElement> {
  const selected = await api.getSelectedElement()

  // The page body cannot have siblings, so a selected body takes the element inside it.
  if (selected && selected.type !== 'Body') {
    return selected.after(api.elementPresets.DOM)
  }

  const parent = selected ?? (await api.getRootElement())

  if (!parent?.children) {
    throw new NoPlaceForElementError('No element on the page can hold the Ticket Fairy element')
  }

  return parent.append(api.elementPresets.DOM)
}

export async function insertEmbedElement(
  api: DesignerApi,
  attributes: Record<string, string>
): Promise<DOMElement> {
  const element = await addEmptyElement(api)

  try {
    await element.setTag('div')

    for (const [name, value] of Object.entries(attributes)) {
      await element.setAttribute(name, value)
    }

    // The name shows in the Navigator only. It is not published.
    await element.setDisplayName(ELEMENT_NAME)
  } catch (error) {
    // An element without its attributes shows nothing on the site, so do not leave it behind.
    await element.remove().catch(() => null)
    throw error
  }

  return element
}

/** Plain-language text for a failed insert. Designer API errors carry a stable `cause.tag`. */
export function insertErrorMessage(error: unknown): string {
  const tag = (error as { cause?: { tag?: unknown } } | null)?.cause?.tag

  switch (tag) {
    case 'ModeForbidden':
    case 'Forbidden':
      return (
        'Webflow only lets you add elements in Design mode, on the main version of the page. ' +
        'Switch there, then try again.'
      )
    case 'InvalidElementPlacement':
    case 'InvalidTargetElement':
      return "Tickets can't go there. Select a section or block on the page, then try again."
    case 'ResourceMissing':
      return 'The element you selected is no longer on the page. Select another one, then try again.'
    default:
      return "We couldn't add the tickets to your page. Try again."
  }
}
