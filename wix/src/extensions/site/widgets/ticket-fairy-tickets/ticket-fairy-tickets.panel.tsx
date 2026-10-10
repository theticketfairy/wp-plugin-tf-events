/**
 * The widget's settings panel, opened from Settings on the widget in the Wix
 * editor. Each value is saved as a widget prop, which Wix copies to the
 * widget's attribute of the same name.
 */
import React, { useEffect, useRef, useState, type FC } from 'react'
import { linkKindFor, parseTicketFairyLink, type EmbedType } from '@ticketfairy/site-embed-core'
import { widget } from '@wix/editor'
import {
  Box,
  Collapse,
  FormField,
  Input,
  Loader,
  RadioGroup,
  SectionHelper,
  SidePanel,
  Text,
  TextButton,
  WixDesignSystemProvider,
} from '@wix/design-system'
import '@wix/design-system/styles.global.css'
import { EventPicker } from './event-picker'
import {
  PROP_NAMES,
  SHOW_OPTIONS,
  chosenType,
  isUsableEmbedKey,
  linkProblem,
  propsForNewLink,
  type PropKey,
  type WidgetProps,
} from './widget-settings'

const PROP_KEYS = Object.keys(PROP_NAMES) as PropKey[]

// Wix asks panels to write one prop at a time and to read it back before the
// next write, or a later write can overwrite one that is still pending.
const setPropConfirmed = async (key: PropKey, value: string) => {
  await widget.setProp(PROP_NAMES[key], value)

  // A prop that was never set can read back as undefined rather than ''.
  if (((await widget.getProp(PROP_NAMES[key])) ?? '') !== value) {
    throw new Error(`The widget did not keep the new value of "${PROP_NAMES[key]}"`)
  }
}

const loadProps = async (): Promise<WidgetProps> => {
  const values = await Promise.all(PROP_KEYS.map((key) => widget.getProp(PROP_NAMES[key])))

  return Object.fromEntries(PROP_KEYS.map((key, index) => [key, values[index] ?? ''])) as WidgetProps
}

const Panel: FC = () => {
  const [props, setProps] = useState<WidgetProps | null>(null)
  const [linkInput, setLinkInput] = useState('')
  const [linkTouched, setLinkTouched] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)
  const pendingWrites = useRef<Promise<void>>(Promise.resolve())

  useEffect(() => {
    loadProps()
      .then((saved) => {
        setProps(saved)
        setLinkInput(saved.link ?? '')
        setAdvancedOpen(Boolean(saved.embedKey))
      })
      .catch(() => setLoadFailed(true))
  }, [])

  if (loadFailed) {
    return (
      <PanelFrame>
        <SectionHelper skin="danger">
          We couldn't open your settings. Close this panel and open Settings again.
        </SectionHelper>
      </PanelFrame>
    )
  }

  if (!props) {
    return (
      <PanelFrame>
        <Box align="center" padding="SP4">
          <Loader size="small" />
        </Box>
      </PanelFrame>
    )
  }

  const save = (changes: WidgetProps) => {
    setProps((current) => ({ ...current, ...changes }))
    setSaveFailed(false)

    for (const key of Object.keys(changes) as PropKey[]) {
      const value = changes[key] ?? ''
      pendingWrites.current = pendingWrites.current
        .then(() => setPropConfirmed(key, value))
        .catch(() => setSaveFailed(true))
    }
  }

  const problem = linkTouched ? linkProblem(parseTicketFairyLink(linkInput)) : null
  // The rest of the panel follows the saved link, not a half-typed one.
  const link = parseTicketFairyLink(props.link ?? '')
  const type = chosenType(props, link)
  const embedKey = props.embedKey ?? ''

  const onLinkChange = (value: string) => {
    setLinkInput(value)

    // Half-typed links are not saved, so the widget keeps its last good link.
    const parsed = parseTicketFairyLink(value)

    if (parsed.kind !== 'invalid' || parsed.reason === 'empty') {
      save(propsForNewLink(props, value))
    }
  }

  return (
    <PanelFrame>
      <SidePanel.Field>
        <FormField
          label="Your Ticket Fairy link"
          status={problem ? 'error' : undefined}
          statusMessage={problem}
        >
          <Input
            value={linkInput}
            placeholder="https://www.ticketfairy.com/event/your-event"
            status={problem ? 'error' : undefined}
            onChange={(event) => onLinkChange(event.target.value)}
            onBlur={() => setLinkTouched(true)}
          />
        </FormField>
        <Box marginTop="SP1">
          <Text size="tiny" secondary>
            Paste the link to your event page or to your brand page, which lists all your events.
          </Text>
        </Box>
      </SidePanel.Field>

      <SidePanel.Field>
        <FormField label="What to show">
          <RadioGroup
            value={type}
            disabledRadios={link.kind === 'event' ? ['listing'] : []}
            onChange={(value) => save({ show: value as EmbedType })}
          >
            {SHOW_OPTIONS.map((option) => (
              <RadioGroup.Radio key={option.type} value={option.type}>
                {option.label}
              </RadioGroup.Radio>
            ))}
          </RadioGroup>
        </FormField>
        {link.kind === 'event' && (
          <Box marginTop="SP1">
            <Text size="tiny" secondary>
              To show your event list, paste your brand page link.
            </Text>
          </Box>
        )}
      </SidePanel.Field>

      {type === 'button' && (
        <SidePanel.Field>
          <FormField label="Button text">
            <Input
              value={props.buttonText ?? ''}
              placeholder="Buy tickets"
              onChange={(event) => save({ buttonText: event.target.value })}
            />
          </FormField>
        </SidePanel.Field>
      )}

      {link.kind === 'brand' && linkKindFor(type) === 'event' && (
        <SidePanel.Field>
          <FormField label="Choose an event">
            <EventPicker
              key={link.brandSlug}
              brandSlug={link.brandSlug}
              chosenEventSlug={props.event ?? ''}
              chosenEventName={props.eventName ?? ''}
              onChoose={(event) => save({ event: event.eventSlug, eventName: event.name })}
            />
          </FormField>
        </SidePanel.Field>
      )}

      <SidePanel.Field>
        <TextButton size="small" ariaExpanded={advancedOpen} onClick={() => setAdvancedOpen((open) => !open)}>
          {advancedOpen ? 'Hide advanced settings' : 'Advanced'}
        </TextButton>
        <Collapse open={advancedOpen}>
          <Box direction="vertical" gap="SP1" marginTop="SP3">
            <FormField
              label="Embed key (optional)"
              status={embedKey && !isUsableEmbedKey(embedKey) ? 'warning' : undefined}
              statusMessage="This embed key is incomplete. Copy it again from your Ticket Fairy dashboard."
            >
              <Input value={embedKey} onChange={(event) => save({ embedKey: event.target.value })} />
            </FormField>
            <Text size="tiny" secondary>
              From Embed on your website in your Ticket Fairy dashboard. Only needed for saved colours and
              allowed websites.
            </Text>
          </Box>
        </Collapse>
      </SidePanel.Field>

      {saveFailed && (
        <SidePanel.Field>
          <SectionHelper skin="danger">
            We couldn't save your last change. Please make it again.
          </SectionHelper>
        </SidePanel.Field>
      )}
    </PanelFrame>
  )
}

const PanelFrame: FC<{ children: React.ReactNode }> = ({ children }) => (
  <WixDesignSystemProvider>
    <SidePanel width="300" height="100vh">
      <SidePanel.Content noPadding stretchVertically>
        {children}
      </SidePanel.Content>
    </SidePanel>
  </WixDesignSystemProvider>
)

export default Panel
