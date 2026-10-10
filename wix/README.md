# Ticket Fairy for Wix

A Wix app with one site widget, **Ticket Fairy Tickets**. An event organiser building a site in
the Wix Editor or Wix Studio installs the app, adds the widget to a page and opens its
**Settings** panel. There they:

1. paste their Ticket Fairy link: an event page (`https://www.ticketfairy.com/event/<name>`) or
   their brand page (`https://www.ticketfairy.com/events/<brand>`);
2. choose **What to show**: Buy tickets button, Checkout on the page, Event list, Set times or
   Line-up;
3. for the button, enter the button text (empty means "Buy tickets");
4. for a brand link and anything other than the event list, choose the event from the brand's
   upcoming events (with **Show more events** for long lists);
5. optionally, under **Advanced**, paste the embed key from **Embed on your website** in the
   Ticket Fairy dashboard (only needed for saved colours and allowed websites).

In the editor the widget shows a preview card that says what will appear, or what to do next.
On the published site it shows the real Ticket Fairy embed.

## How it works

Built with the current Wix CLI (`@wix/cli`, Astro based). See the repository README for the
shared embed contract.

| File (under `src/`) | Job |
| --- | --- |
| `extensions.ts` | Registers the widget with the app. |
| `extensions/site/widgets/ticket-fairy-tickets/ticket-fairy-tickets.extension.ts` | Widget name, tag name, size, thumbnail. |
| `.../ticket-fairy-tickets.tsx` | The widget: a custom element class. Wix calls `customElements.define()` for it. |
| `.../ticket-fairy-tickets.panel.tsx` | The Settings panel (React, Wix Design System). |
| `.../event-picker.tsx` | The brand event list in the panel. |
| `.../widget-settings.ts` | Prop names, props to embed settings, preview and error text. |

- The panel saves each value with `widget.setProp()` from `@wix/editor`, one at a time, reading
  each back with `getProp()` before the next write, as Wix asks. Wix copies each prop to the
  widget attribute of the same name: `link`, `show`, `event`, `event-name`, `button-text`,
  `embed-key`. The widget watches these in `observedAttributes`.
- The widget renders into its light DOM (no shadow root), because the Ticket Fairy loader looks
  for `[data-ttf-embed]` in `document`. It writes the placeholder from `embedAttributes()` and
  calls `loadEmbedsAndScan()`. When a setting that changes the embed changes, it replaces the
  placeholder, because the loader never renders a placeholder twice.
- It detects the editor with `window.viewMode()` from `@wix/site-window` (`'Editor'`), as the
  Wix guide *Handle Sandboxing in the Editor* shows. If the view mode does not arrive in 3
  seconds, or fails, it shows the live embed, so a published page is never left empty.
- Until the settings are complete, visitors see nothing.

### Versions

Every dependency is pinned. `@wix/astro` is on **2.75.2** with `astro` **5.18.2**: `@wix/astro`
3 removed `extensions.customElement()` (and all other site extensions) and tells projects that
need them to stay on `@wix/astro@^2` and `astro@^5`. On that version the widget's extension
file takes `installation.autoAdd`; the current docs show `installation.staticContainer`, which
the package does not accept yet.

### pnpm workspace

The app imports `@ticketfairy/site-embed-core` with `workspace:*`. The Wix build bundles the
core's TypeScript source without any extra step.

The Wix build resolves some imports, such as `@wix/sdk-context`, from the app folder rather
than from the package that imports them. pnpm does not put those packages there, so the
repository's root `.npmrc` hoists `@wix/*`, and `@astrojs/cloudflare` (used by the hosting
adapter) is a direct dev dependency here. Without these, `wix build` fails with "Rollup failed
to resolve import".

## Commands

From this folder (or `pnpm --filter @ticketfairy/wix <script>` from the root):

```bash
pnpm test        # vitest: settings mapping, copy and the widget element
pnpm typecheck   # tsc --noEmit -p .
pnpm dev         # wix dev: needs a Wix account and a connected app
pnpm build       # wix build: needs .env.local from `wix env pull`
pnpm preview     # wix preview: uploads a preview version
pnpm release     # wix release: creates an app version
```

## Connect this folder to a Wix app

You need a Wix account with access to the Ticket Fairy company in the Wix Dev Center.

1. Log in: `npx wix login`.
2. Create the app. Either:
   - go to <https://manage.wix.com/studio/custom-apps>, create a new app named **Ticket Fairy**
     and copy its App ID, or
   - run `npm create @wix/new@latest -- app` in a scratch folder, name it **Ticket Fairy**,
     and copy `appId` from the `wix.config.json` it creates. Delete the scratch folder after.
3. Put the App ID in `wix.config.json` as `appId` (it holds a placeholder now). Do not change
   anything else in that file.
4. Pull the app's credentials: `npx wix env pull`. This writes `.env.local` (ignored by Git;
   never commit it).
5. `pnpm install` at the repository root, then `pnpm dev` here. Choose the option to open the
   editor on your test site, add **Ticket Fairy Tickets** from the **Add** panel and open its
   **Settings**.

## Release and App Market submission

1. `pnpm build`, then `pnpm release` and follow the prompts. Release registers the widget
   with the app; `wix preview` alone does not register site widgets.
2. Install the released version on a premium test site and check the published site:
   button, checkout, event list, set times and line-up, with an event link and a brand link.
3. In the app dashboard, fill in **App Profile**:
   - **App name**: Ticket Fairy.
   - **Teaser** (Wix asks for no company name here): "Sell tickets to your events on your
     site with a buy button, full checkout, event list, set times or line-up."
   - **Icon**: 1000 × 1000 px, 24-bit PNG, sRGB, solid background, no text. Use the Ticket
     Fairy mark from the brand assets.
   - **Features** (at least three), **description**, 5–6 images at 1200 × 900 px or larger
     (two on a Wix template, one or two of the Settings panel), a demo site URL and the terms
     and conditions link.
4. Replace `public/ticket-fairy-tickets-thumbnail.png` (the **Add** panel image) with a design
   from the brand team if wanted.
5. Go to **Submit App**, clear every blocker in the **Submission Summary**, and in the note to
   the reviewer explain: install the app, add Ticket Fairy Tickets, paste a public Ticket Fairy
   event link (give one that has tickets on sale), publish.

## Verified here, and what needs a Wix account

Verified without an account:

- `pnpm test` and `pnpm typecheck` pass.
- `wix build` passes with a placeholder `WIX_CLIENT_ID` in the environment. It bundles the
  widget (about 13 kB plus the Wix client), the panel and an app manifest with the widget,
  its tag name, settings panel URL and thumbnail.
- Extension options, `widget.getProp`/`setProp` and `window.viewMode()` match the installed
  package types.

Needs a Wix account and a real app:

- `wix dev`, `wix preview`, `wix release` and the App Market submission.
- That props set by the panel arrive as attributes on the widget, in the editor and on the
  published site, and that the preview card shows in the editor.
- That `window.viewMode()` returns `'Editor'` for a CLI custom element. The Wix reference
  page only promises it for Blocks widgets; the sandboxing guide uses it for all site widgets.
- That the thumbnail shows in the **Add** panel. The build serves `public/` files at the root,
  so the extension uses `{{BASE_URL}}/ticket-fairy-tickets-thumbnail.png`, not `/public/...`
  as one Wix page shows.
- That the embed checkout works in the editor's **Preview**: Wix says some browser storage is
  blocked there. Check the published site first.
- That the event list request from the panel (`/api/embed/events/<brand>`) is allowed from the
  panel's Wix domain.
- Whether App Market review accepts selling tickets through the embed checkout. Wix's billing
  rules are about charging site owners for the app, which this app does not do, but confirm
  with Wix if the reviewer asks.
