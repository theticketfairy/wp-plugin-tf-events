import { extensions } from '@wix/astro/builders'

// The organiser adds the widget from the editor's Add panel to the page where
// they want to sell tickets, so it is not added on install. The current docs
// name this `installation.staticContainer`, but @wix/astro 2 (the last major
// version with custom elements) still requires `installation.autoAdd`.
export default extensions.customElement({
  id: 'ac97c1f7-849a-49a7-915c-353fb5576712',
  name: 'Ticket Fairy Tickets',
  width: {
    defaultWidth: 600,
    allowStretch: true,
  },
  height: {
    defaultHeight: 160,
  },
  installation: {
    autoAdd: false,
  },
  tagName: 'ticket-fairy-tickets',
  element: './extensions/site/widgets/ticket-fairy-tickets/ticket-fairy-tickets.tsx',
  settings: './extensions/site/widgets/ticket-fairy-tickets/ticket-fairy-tickets.panel.tsx',
  presets: [
    {
      id: '38ce558b-7d4f-4574-b221-91a57e9a766c',
      name: 'Ticket Fairy Tickets',
      // The build copies `public/` to the root of the uploaded files, so the
      // image is at the root, not under /public as some Wix docs show.
      thumbnailUrl: '{{BASE_URL}}/ticket-fairy-tickets-thumbnail.png',
    },
  ],
})
