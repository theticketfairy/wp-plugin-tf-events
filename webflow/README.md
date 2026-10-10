# Ticket Fairy for Webflow

A Webflow **Designer Extension** for the Webflow Apps marketplace. An event organiser adds Ticket
Fairy tickets to a Webflow page without writing code:

1. They open the **Ticket Fairy** app in the Designer (press **E**, then choose the app).
2. They paste their event page link (`https://www.ticketfairy.com/event/<name>`) or brand page
   link (`https://www.ticketfairy.com/events/<brand>`).
3. They choose what to show: **Buy tickets button**, **Checkout on the page**, **Event list**,
   **Set times** or **Line-up**. With a brand link and anything other than the event list, they
   choose the event from the brand's upcoming events (24 per page, **Show more events** for the
   next page).
4. Optional: **Button text**, and an **Embed key** under **Advanced**.
5. **Add to page** puts the element after the selected element. When the page body or nothing
   is selected, the element goes at the end of the page. The new element is selected and is named
   **Ticket Fairy tickets** in the Navigator.

The element is a Webflow custom element (Designer API `webflow.elementPresets.DOM`): a `<div>`
with the `data-ttf-embed` attributes from `embedAttributes()` in `packages/core`. The Ticket Fairy
embed loader on the published site turns it into the button, checkout, list or line-up.

## Files

| File | Purpose |
| --- | --- |
| `webflow.json` | Webflow app manifest. Designer API version 2, `comfortable` panel (320 × 460), serves `dist`. |
| `index.html` | Panel markup. Body content only, because Webflow wraps it in its own page. |
| `src/main.ts` | Panel behaviour: link field, event picker, inserting the element, the setup step. |
| `src/choices.ts` | Turns the panel choices into embed settings and plain-language problems. |
| `src/insert.ts` | Puts the element on the page with the Designer API, and explains failures. |
| `src/setup.ts` | Remembers per site that the organiser added the loader line. |
| `src/webflow.test.ts` | Tests for the three modules above. |

## The loader line: why there is a one-time copy step

The embed loader (`LOADER_SCRIPT_HTML`, a `<script src=".../event-embed.js" async>` tag) must be
on the published site once. The options were:

- **Data API custom code (registered scripts).** This adds a site-wide script without the
  organiser doing anything. It needs an OAuth "hybrid app" with a backend that keeps the client
  secret and calls the Data API. Version 1 has no backend, so we do not use this yet.
- **A custom element with tag `script` and a `src` attribute.** The Designer API reference
  (`setTag`, `setAttribute`, the custom element and element presets pages, checked October 2026)
  does not say that a `script` custom element is allowed or that it runs on the published site.
  Webflow's help pages tell users to put scripts in a Code Embed element or in the site's custom
  code. Because the docs do not clearly say yes, we do not rely on it.
- **The Designer API cannot write the code inside a Code Embed element.**

So after **Add to page** the panel shows the step **One last step, only once per site**:
paste the line into **Site settings → Custom code → Footer code**, with a **Copy** button, and
"Publish your site to see it working. The tickets don't show inside the Designer." The
organiser ticks **I've done this**. The panel stores that per site in the extension's local
storage (`ttf-loader-added:<siteId>`) and folds the step away. The step stays available from its
heading, and unticking it shows the step again. If storage is blocked, the step shows every time.

The panel cannot check whether the line is in the footer code, because the Designer API cannot
read site custom code. It does not pretend to check.

### Future work: remove the copy step with a hybrid app

1. Add a small backend that does the Webflow OAuth flow and keeps the client secret, with the
   `custom_code:write` scope. This makes the app a hybrid app (Designer Extension plus Data client).
2. When the organiser first adds tickets to a site, the extension asks the backend to register the
   hosted loader on that site: `POST /v2/sites/{site_id}/registered_scripts/hosted` with
   `hostedLocation` (the loader address), `integrityHash`, `version` and `displayName`.
3. The backend then applies it: `PUT /v2/sites/{site_id}/custom_code` with the script in the
   `footer` location. This call replaces the app's whole script list for the site, so always send
   every script the app applies.
4. Remove the copy step, or show it only when the backend call fails.

`integrityHash` is required, but the loader is updated in place at the same address, so a fixed
hash would break on the next loader release. Agree a versioned loader address, or another way to
handle this, with the `legacy` team before building this.

## Local development

You need Node.js 22.13 or later (the Webflow CLI needs it) and pnpm.

```bash
pnpm install                 # from the repository root
cd webflow
pnpm dev                     # rebuilds dist/ when a file changes
pnpm serve                   # in a second terminal: Webflow CLI serves dist/ at http://localhost:1337
```

`pnpm serve` runs `webflow extension serve` from the pinned Webflow CLI
(`@webflow/webflow-cli@2.12.0`) through `pnpm dlx`. The CLI has hundreds of dependencies, so it is
not a project dependency. To turn off the CLI's usage data, run
`pnpm dlx @webflow/webflow-cli@2.12.0 auth telemetry --disable`.

To open the extension in the Designer:

1. Register the app (once, below) and install it on a test site: **Workspace settings → Apps &
   Integrations → Develop**, then **…** next to the app → **Install**.
2. Open the test site in the Designer, press **E**, find the app and click **Launch development
   app**. The Designer loads it from `http://localhost:1337`.
3. After a change, wait for `pnpm dev` to rebuild, then use the reload button at the top of the
   extension panel.

Checks:

```bash
pnpm test        # vitest
pnpm typecheck   # tsc
pnpm build       # vite build to dist/
```

## Register the app in a Webflow workspace

1. Open **Workspace settings → Apps & Integrations → Develop** and click **Create an App**.
   You need to be a workspace admin.
2. Name: **Ticket Fairy**. Add the icon and a short description.
3. Under **Building blocks**, turn on **Designer Extension**. Leave **Data client** off for
   version 1. No Data API scopes are needed.
4. Save. Install it on a test site (above).

## Bundle, upload and submit to the Apps marketplace

1. Bundle:

   ```bash
   cd webflow
   pnpm bundle      # vite build, then webflow extension bundle -> webflow/bundle.zip
   ```

   The bundle holds `webflow.json`, `index.html` and the hashed `assets/`. It is about 7 KB and the
   limit is 5 MB. It has no source maps, because Webflow does not accept a bundle with source maps.
2. Upload: **Workspace settings → Apps & Integrations → Develop**, find the app and click **Publish
   extension version**. Choose `bundle.zip` and add release notes. This needs a workspace admin
   with two-factor authentication turned on.
3. Test the uploaded version: open a site, open the app and click **Launch App** (not **Launch
   development app**).
4. Submit at <https://developers.webflow.com/submit>. Include the listing text, screenshots, support
   details and, in the **Source map artifact** field, one ZIP of the source. Because Vite bundles
   `packages/core` into the extension, include `webflow/`, `packages/core/`, the root
   `package.json`, `pnpm-workspace.yaml` and `pnpm-lock.yaml`, and say in a short README that
   `pnpm install && pnpm --filter ./webflow bundle` makes the bundle.
5. Webflow reviews the app against its Marketplace Guidelines. Approval usually takes a few days.

## Not checked without a Webflow account

These were checked against the documentation, the typings (`@webflow/designer-extension-typings`
2.2.2) and the CLI (2.12.0) only, not in a real Designer:

- That `after()` and `append()` with `webflow.elementPresets.DOM`, then `setTag('div')`,
  `setAttribute()` and `setDisplayName()`, give a published `<div data-ttf-embed=...>` with the
  attributes unchanged.
- Which Designer API error `cause.tag` comes back when the Designer is in a mode that cannot add
  elements, or the selection cannot have a sibling. The panel maps the documented tags to plain
  messages and has a general message for the rest.
- That `getRootElement()` returns the page body when nothing is selected.
- That the Designer's extension frame allows the clipboard. If the clipboard is blocked, the line
  is selected so the organiser can copy it, and the button says so.
- That the extension frame can call `https://www.ticketfairy.com/api/embed/events/...`. The
  endpoint allows calls from any website, so it should work.
- That `localStorage` keeps the setup step's **I've done this** between Designer sessions.
- The Apps marketplace review itself.
