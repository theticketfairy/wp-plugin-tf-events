import { loadEmbedsAndScan } from '@ticketfairy/site-embed-core'
import { addPropertyControls, ControlType, RenderTarget } from 'framer'
import { type CSSProperties, useEffect } from 'react'

import {
  DEFAULT_SHOW,
  EMBED_KEY_HELP,
  readSettings,
  SHOW_LABELS,
  type TicketFairyTicketsProps,
} from './settings'

type Props = TicketFairyTicketsProps & { style?: CSSProperties }

const cardStyle: CSSProperties = {
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  padding: 16,
  borderRadius: 10,
  border: '1px dashed rgba(0, 0, 0, 0.2)',
  background: 'rgba(0, 0, 0, 0.03)',
  color: '#222',
  fontFamily: 'Inter, system-ui, sans-serif',
  fontSize: 14,
  lineHeight: 1.4,
}

const smallTextStyle: CSSProperties = { fontSize: 12, color: '#666' }

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight auto
 * @framerIntrinsicWidth 400
 * @framerIntrinsicHeight 120
 */
export default function TicketFairyTickets(props: Props) {
  const { style } = props
  const { attributes, message, note } = readSettings(props)
  const isCanvas = RenderTarget.current() === RenderTarget.canvas

  // The loader marks each element it has rendered and skips it after that.
  // A settings change must therefore create a new element, so the attributes
  // are also the element's key.
  const embedKey = attributes ? JSON.stringify(attributes) : ''

  useEffect(() => {
    if (!isCanvas && embedKey) {
      loadEmbedsAndScan()
    }
  }, [isCanvas, embedKey])

  // The live embed needs the published page, so the canvas shows a card that
  // says what will appear there.
  if (isCanvas) {
    return (
      <div style={{ ...cardStyle, ...style }}>
        <span style={smallTextStyle}>Ticket Fairy</span>
        <strong style={{ fontWeight: 600 }}>{message}</strong>
        {note && <span style={smallTextStyle}>{note}</span>}
        {attributes && <span style={smallTextStyle}>Shows on your published site and in Preview.</span>}
      </div>
    )
  }

  if (!attributes) {
    return null
  }

  return (
    <div style={style}>
      <div key={embedKey} {...attributes} />
    </div>
  )
}

TicketFairyTickets.displayName = 'Ticket Fairy Tickets'

addPropertyControls(TicketFairyTickets, {
  link: {
    type: ControlType.String,
    title: 'Ticket Fairy link',
    placeholder: 'https://www.ticketfairy.com/event/…',
    description: 'Paste the link to your event page, or to your brand page for the event list.',
  },
  show: {
    type: ControlType.Enum,
    title: 'What to show',
    defaultValue: DEFAULT_SHOW,
    options: Object.keys(SHOW_LABELS),
    optionTitles: Object.values(SHOW_LABELS),
  },
  buttonText: {
    type: ControlType.String,
    title: 'Button text',
    placeholder: 'Buy tickets',
    hidden: (props: Props) => (props.show ?? DEFAULT_SHOW) !== 'button',
  },
  advanced: {
    type: ControlType.Object,
    title: 'Advanced',
    optional: true,
    controls: {
      embedKey: {
        type: ControlType.String,
        title: 'Embed key',
        description: EMBED_KEY_HELP,
      },
    },
  },
})
