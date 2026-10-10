/**
 * The "Ticket Fairy Tickets" site widget.
 *
 * Wix defines this class as a custom element with the tag name from the
 * extension file and copies the settings panel's values to its attributes.
 *
 * It renders into its own light DOM, not a shadow root: the Ticket Fairy
 * embed loader looks for `[data-ttf-embed]` placeholders in `document`, and a
 * shadow root would hide the placeholder from it.
 */
import { loadEmbedsAndScan } from '@ticketfairy/site-embed-core'
import { window as siteWindow } from '@wix/site-window'
import styles from './ticket-fairy-tickets.module.css'
import {
  OBSERVED_ATTRIBUTES,
  placeholderAttributesFromProps,
  previewCopy,
  readProps,
} from './widget-settings'

// The editor sandbox blocks some Wix calls. If the view mode never arrives,
// show the live embed rather than leave a published page empty.
const VIEW_MODE_TIMEOUT_MS = 3000

let editorCheck: Promise<boolean> | undefined

function isInEditor(): Promise<boolean> {
  editorCheck ??= Promise.race([
    siteWindow.viewMode().then((mode) => mode === 'Editor'),
    new Promise<boolean>((resolve) => setTimeout(() => resolve(false), VIEW_MODE_TIMEOUT_MS)),
  ]).catch(() => false)

  return editorCheck
}

class TicketFairyTickets extends HTMLElement {
  static get observedAttributes(): string[] {
    return OBSERVED_ATTRIBUTES
  }

  // Identifies what is on show, so a change to an unrelated setting does not
  // reload a checkout the visitor may be using.
  private renderedKey: string | null = null

  // Renders wait for the view mode. Only the latest one may change the DOM.
  private renderCount = 0

  connectedCallback(): void {
    void this.render()
  }

  attributeChangedCallback(_name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue !== newValue && this.isConnected) {
      void this.render()
    }
  }

  private async render(): Promise<void> {
    const renderNumber = ++this.renderCount
    const inEditor = await isInEditor()

    if (renderNumber !== this.renderCount) {
      return
    }

    const props = readProps(this)

    if (inEditor) {
      this.showPreview(previewCopy(props))

      return
    }

    this.showEmbed(placeholderAttributesFromProps(props))
  }

  private showEmbed(attributes: Record<string, string> | null): void {
    const key = JSON.stringify(attributes)

    if (key === this.renderedKey) {
      return
    }

    this.renderedKey = key

    // Visitors see nothing until the organiser finishes the settings.
    if (!attributes) {
      this.replaceChildren()

      return
    }

    // The loader marks a placeholder as done and never renders it again, so a
    // changed setting needs a new placeholder, not changed attributes.
    const placeholder = document.createElement('div')

    for (const [name, value] of Object.entries(attributes)) {
      placeholder.setAttribute(name, value)
    }

    this.replaceChildren(placeholder)
    loadEmbedsAndScan(document)
  }

  private showPreview({ title, detail }: { title: string; detail: string }): void {
    this.renderedKey = null

    const card = document.createElement('div')
    card.className = styles.preview

    const heading = document.createElement('strong')
    heading.className = styles.title
    heading.textContent = title

    const text = document.createElement('p')
    text.className = styles.detail
    text.textContent = detail

    card.append(heading, text)
    this.replaceChildren(card)
  }
}

export default TicketFairyTickets
