# Ticket Fairy for Framer

An event organiser building a site in Framer adds Ticket Fairy tickets without code:

1. Open the **Ticket Fairy Tickets** plugin.
2. Paste the link to an event page (`https://www.ticketfairy.com/event/<event-name>`) or to the
   brand page (`https://www.ticketfairy.com/events/<brand-name>`).
3. For a brand page link, choose **All upcoming events** (the event list) or one event from the list.
4. Choose what to show: **Buy tickets button**, **Checkout on the page**, **Set times** or
   **Line-up**. For the button, optionally enter the button text.
5. Select **Add to page**.

The plugin adds the **Ticket Fairy Tickets** code component with those settings. The organiser can
change the settings later in Framer's right-hand panel. The component also works on its own from
the Insert menu.

| Folder | What it is | Listed as |
| --- | --- | --- |
| [`component`](component) | The Ticket Fairy Tickets code component | Framer Marketplace component |
| [`plugin`](plugin) | The panel that adds the component | Framer Marketplace plugin |

## How the component works

- Properties: **Ticket Fairy link**, **What to show** (five options), **Button text** (only shown
  for the button) and an optional **Advanced > Embed key**. The embed key comes from **Embed on your
  website** in the Ticket Fairy dashboard and is only needed for saved colours and allowed websites.
- On the published site and in Preview, it renders the `data-ttf-embed` element from
  `embedAttributes()` and calls `loadEmbedsAndScan()`. The loader skips elements it has already
  rendered, so the element's React `key` is its attribute set: new settings make a new element.
- On the Framer canvas it does not load the live embed. It shows a card that says what will appear
  ("Buy tickets button for Anyma Tulum 2027") or what to fix ("Paste your Ticket Fairy event link").
- On the published site, a component with a missing or wrong link renders nothing, so buyers never
  see a setup message.
- Sizing: width `any-prefer-fixed`, height `auto` (the embed sets its own height).

### One file for Framer, one source of truth

Framer imports a code component as a single module by URL, so the component cannot import
`packages/core` from the workspace. The source in `component/src` imports core normally, and
`component/build.mjs` uses esbuild to bundle core into one file,
`component/dist/TicketFairyTickets.tsx`. `framer` and `react` stay as imports, because Framer
supplies them. Framer reads the sizing annotations only from the comment directly above the
component, and esbuild drops comments, so the build script puts that comment back. The build fails
if it cannot do this.

The plugin imports the property names and labels from `component/src/settings.ts`, so the plugin
and the component cannot disagree.

## Local development

From the repository root:

```bash
pnpm install
pnpm --filter "./framer/*" test
pnpm --filter "./framer/*" typecheck
pnpm --filter "./framer/*" build
```

### Component

1. Run `pnpm --filter @ticketfairy/framer-component build`.
2. In a Framer project, open **Assets > Code**, create a code file named `TicketFairyTickets` and
   replace its contents with `framer/component/dist/TicketFairyTickets.tsx`.
3. Drag the component onto a page, paste a link in the right-hand panel and open Preview to see the
   live embed. The canvas only shows the card.

Edit `component/src`, never the built file.

### Plugin

1. Run `pnpm --filter @ticketfairy/framer-plugin dev`. The first run of `vite-plugin-mkcert`
   downloads mkcert from GitHub and installs a local certificate, which can ask for your password.
2. In Framer, open the **Plugins** menu, open **Developer Tools** and select **Open Development
   Plugin**. Framer loads the plugin from `https://localhost:5173`.
3. **Add to page** only works after `COMPONENT_URL` points to a component (see below). While
   developing, you can use the URL of your own copy of the component from step 2 above.

## Publishing

Publish the component first, because the plugin needs its URL.

### 1. Publish the component

1. Run `pnpm --filter @ticketfairy/framer-component build`.
2. In the Ticket Fairy Framer project that will hold the component, open **Assets > Code**, create
   or open the code file `TicketFairyTickets`, paste in the contents of
   `framer/component/dist/TicketFairyTickets.tsx` and save.
3. Submit the component on the Framer Marketplace dashboard
   (<https://www.framer.com/marketplace/dashboard/>) as a new component, with the project from
   step 2.

### 2. Copy the component URL into the plugin

1. In **Assets > Code**, right-click `TicketFairyTickets` and select **Copy URL**.
2. Remove the `@` and everything after it. Without it, the plugin always adds the latest saved
   version of the component.
3. Paste the result into `COMPONENT_URL` in `framer/plugin/src/controls.ts`.

### 3. Publish the plugin

1. Check the plugin in Framer in light and dark mode: a brand link with events, a brand with no
   events, a link to a brand page that does not exist, and an event link.
2. Run `pnpm --filter @ticketfairy/framer-plugin run pack`. Use `run`: `pnpm pack` is pnpm's own
   tarball command. This builds the plugin and writes `framer/plugin/plugin.zip`.
3. On the Framer Marketplace dashboard (<https://www.framer.com/marketplace/dashboard/plugins/>),
   select **New Plugin**, upload `plugin.zip`, complete the form and submit.
4. For an update, change the code, run the pack command again and upload the new zip in the
   Marketplace dashboard.

`framer/plugin/framer.json` holds the plugin's id, name, mode (`canvas`) and icon. Keep the id:
Framer uses it to recognise updates.

## Not verified without a Framer account

These steps were built from Framer's documentation, the official `create-framer-plugin` starter
(1.5.1) and the published type definitions (`framer` 3.0.4, `@framer/plugin` 5.1.0). They were not
run inside Framer:

- That Framer accepts the bundled component file: imports below the bundled core, `// @ts-nocheck`
  at the top, and the sizing annotations restored by `build.mjs`.
- How the **Advanced** object property and the hidden **Button text** property look in Framer's
  panel, and that Preview runs the embed loader as the published site does.
- `framer.addComponentInstance` with `attributes.controls` setting the properties, including the
  `addComponentInstance` permission check.
- The exact names of the Marketplace dashboard form fields for components and plugins.
- The menu names for opening a development plugin (**Developer Tools > Open Development Plugin**).
- The real component URL. `COMPONENT_URL` is a placeholder until the component is published.
