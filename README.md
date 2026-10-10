# Ticket Fairy website plugins

Plugins that let an event organiser sell Ticket Fairy tickets on a website they built with a
website builder, without pasting code.

| Folder | Builder | Where it is listed |
| --- | --- | --- |
| [`wordpress/ticket-fairy-events`](wordpress/ticket-fairy-events) | WordPress | WordPress.org plugin directory |
| [`framer`](framer) | Framer | Framer Marketplace (component and plugin) |
| [`webflow`](webflow) | Webflow | Webflow Apps marketplace |
| [`wix`](wix) | Wix | Wix App Market |
| [`packages/core`](packages/core) | All of them | Not listed: shared code |

Squarespace has no marketplace for page widgets. Squarespace sites use the copy-and-paste code
from the dashboard's **Embed on your website** page, in a Code block.

## How every plugin works

1. The organiser pastes a link they already have:
   - an event page, `https://www.ticketfairy.com/event/<event-name>`, or
   - their brand page, `https://www.ticketfairy.com/events/<brand-name>`.

   A brand page link opens a list of the brand's upcoming events to choose from. No sign-in.
2. They choose what to show: a **Buy tickets button**, the **checkout** on the page, the
   brand's **event list**, the **set times** or the **line-up**.
3. The plugin writes a `data-ttf-embed` placeholder into the page and loads the Ticket Fairy embed
   loader (`https://www.ticketfairy.com/resources/js/event-embed.js`) once.

The loader does the rest. Checkout, payments, promoter attribution and tracking pixels behave
exactly as they do for a pasted embed snippet. The plugins never handle tickets or payments.

The contract the plugins depend on lives in the `legacy` repository, in
`docs/EVENT_EMBEDS.md`:

- the placeholder attributes: `data-ttf-embed`, `data-event`, `data-brand`, `data-label` and
  `data-widget-key`;
- `window.TTFEmbed.scan()`, which finds placeholders added after the page loaded;
- the open event list, `GET https://www.ticketfairy.com/api/embed/events/<brand-name>`.

`packages/core` holds that contract once, with tests. Every plugin that uses JavaScript imports it.

## Commands

```bash
pnpm install
pnpm test        # every package's tests
pnpm typecheck
pnpm build       # core checks and the WordPress block editor bundle
```

Each builder folder has its own README with the steps to run it locally and to submit it to its
marketplace.
