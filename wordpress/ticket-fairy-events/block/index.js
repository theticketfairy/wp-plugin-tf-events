"use strict";
(() => {
  // ../packages/core/src/links.ts
  var ACCEPTED_HOSTS = /* @__PURE__ */ new Set([
    "ticketfairy.com",
    "www.ticketfairy.com",
    "theticketfairy.com",
    "www.theticketfairy.com"
  ]);
  var SLUG_PATTERN = /^[a-z0-9_-]+$/i;
  function parseTicketFairyLink(input) {
    const trimmed = (input || "").trim();
    if (trimmed === "") {
      return { kind: "invalid", reason: "empty" };
    }
    const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    let url;
    try {
      url = new URL(withProtocol);
    } catch {
      return { kind: "invalid", reason: "unrecognised" };
    }
    if (!ACCEPTED_HOSTS.has(url.hostname.toLowerCase())) {
      return { kind: "invalid", reason: "not-ticket-fairy" };
    }
    const [section, slug, ...rest] = url.pathname.split("/").filter(Boolean);
    if (!slug || rest.length > 0 || !SLUG_PATTERN.test(slug)) {
      return { kind: "invalid", reason: "unrecognised" };
    }
    if (section === "event") {
      return { kind: "event", eventSlug: slug };
    }
    if (section === "events") {
      return { kind: "brand", brandSlug: slug };
    }
    return { kind: "invalid", reason: "unrecognised" };
  }

  // ../packages/core/src/embeds.ts
  var LOADER_URL = "https://www.ticketfairy.com/resources/js/event-embed.js";
  function linkKindFor(type) {
    return type === "listing" ? "brand" : "event";
  }
  var LOADER_SCRIPT_HTML = `<script src="${LOADER_URL}" async><\/script>`;

  // ../packages/core/src/events.ts
  var LISTING_ENDPOINT = "https://www.ticketfairy.com/api/embed/events/";
  var EVENTS_PER_PAGE = 24;
  var BrandNotFoundError = class extends Error {
    constructor(brandSlug) {
      super(`No Ticket Fairy brand page found for "${brandSlug}"`);
      this.name = "BrandNotFoundError";
    }
  };
  function toBrandEvent(card) {
    var _a, _b, _c, _d, _e;
    if (!card.url_name) {
      return null;
    }
    return {
      name: card.name || card.url_name,
      eventSlug: card.url_name,
      url: card.url || "",
      startDate: (_a = card.start_date) != null ? _a : null,
      timezone: (_b = card.timezone) != null ? _b : null,
      venueName: (_c = card.venue_name) != null ? _c : null,
      city: (_d = card.city) != null ? _d : null,
      imageUrl: (_e = card.image_url) != null ? _e : null,
      soldOut: Boolean(card.sold_out)
    };
  }
  async function fetchBrandEvents(brandSlug, options = {}) {
    var _a, _b;
    const { page = 1, signal, fetchImpl = fetch } = options;
    const url = `${LISTING_ENDPOINT}${encodeURIComponent(brandSlug)}?page=${page}&per_page=${EVENTS_PER_PAGE}`;
    const response = await fetchImpl(url, { signal, credentials: "omit" });
    if (response.status === 404) {
      throw new BrandNotFoundError(brandSlug);
    }
    if (!response.ok) {
      throw new Error(`Event list request failed with status ${response.status}`);
    }
    const body = await response.json();
    const events = ((_a = body.events) != null ? _a : []).map(toBrandEvent).filter((event) => event !== null);
    return { events, hasMore: Boolean((_b = body.pagination) == null ? void 0 : _b.has_more) };
  }
  function formatEventDate(date, timezone, locale) {
    const options = { weekday: "short", day: "numeric", month: "short", year: "numeric" };
    try {
      return new Intl.DateTimeFormat(locale, { ...options, timeZone: timezone || void 0 }).format(date);
    } catch {
      return new Intl.DateTimeFormat(locale, options).format(date);
    }
  }
  function describeEvent(event, locale) {
    const parts = [];
    if (event.startDate) {
      const date = new Date(event.startDate);
      if (!Number.isNaN(date.getTime())) {
        parts.push(formatEventDate(date, event.timezone, locale));
      }
    }
    const place = [event.venueName, event.city].filter(Boolean).join(", ");
    if (place) {
      parts.push(place);
    }
    return parts.join(" \xB7 ");
  }

  // src/labels.ts
  var { __ } = wp.i18n;
  var typeLabel = (type) => {
    switch (type) {
      case "button":
        return __("Buy tickets button", "ticket-fairy-events");
      case "checkout":
        return __("Checkout on the page", "ticket-fairy-events");
      case "listing":
        return __("Your event list", "ticket-fairy-events");
      case "timetable":
        return __("Set times", "ticket-fairy-events");
      case "lineup":
        return __("Line-up", "ticket-fairy-events");
    }
  };
  var typeDescription = (type) => {
    switch (type) {
      case "button":
        return __("A button that opens the checkout over your page.", "ticket-fairy-events");
      case "checkout":
        return __("Ticket choice and payment, right on your page.", "ticket-fairy-events");
      case "listing":
        return __("All your upcoming events, with tickets on sale on your page.", "ticket-fairy-events");
      case "timetable":
        return __("Who plays when, by day and stage.", "ticket-fairy-events");
      case "lineup":
        return __("The acts, with photos and links.", "ticket-fairy-events");
    }
  };
  var ORDER = ["button", "checkout", "listing", "timetable", "lineup"];
  var showOptions = () => ORDER.map((type) => ({ value: type, label: typeLabel(type) }));
  var blockVariations = () => ORDER.map((type) => ({
    name: type,
    // The brand name is never translated.
    title: `Ticket Fairy: ${typeLabel(type)}`,
    description: typeDescription(type),
    attributes: { show: type },
    isDefault: type === "button",
    scope: ["inserter", "transform"],
    isActive: ["show"]
  }));

  // src/editor.tsx
  var { registerBlockType } = wp.blocks;
  var { useBlockProps, InspectorControls } = wp.blockEditor;
  var { PanelBody, TextControl, SelectControl, Button, Notice, Spinner, Placeholder, ExternalLink } = wp.components;
  var { useEffect, useState } = wp.element;
  var { __: __2, sprintf } = wp.i18n;
  var useBrandEvents = (brandSlug) => {
    const [state, setState] = useState({ status: "idle" });
    const [page, setPage] = useState(1);
    useEffect(() => {
      if (!brandSlug) {
        setState({ status: "idle" });
        return void 0;
      }
      const controller = new AbortController();
      const earlier = page > 1 && state.status === "ready" ? state.events : [];
      setState({ status: "loading", events: earlier });
      fetchBrandEvents(brandSlug, { page, signal: controller.signal }).then(
        ({ events, hasMore }) => setState({ status: "ready", events: [...earlier, ...events], hasMore, page })
      ).catch((error) => {
        if (!controller.signal.aborted) {
          setState({ status: "error", brandMissing: error instanceof BrandNotFoundError });
        }
      });
      return () => controller.abort();
    }, [brandSlug, page]);
    return [state, () => setPage((current) => current + 1)];
  };
  var linkProblem = (link, show) => {
    const parsed = parseTicketFairyLink(link);
    if (parsed.kind === "invalid") {
      return parsed.reason === "empty" ? null : __2(
        "That isn't a Ticket Fairy link. Copy the link from your event page or brand page.",
        "ticket-fairy-events"
      );
    }
    if (linkKindFor(show) === "brand" && parsed.kind !== "brand") {
      return __2(
        "To show all your events, enter your brand page link. It looks like ticketfairy.com/events/your-brand.",
        "ticket-fairy-events"
      );
    }
    return null;
  };
  var EventPicker = ({
    brandSlug,
    value,
    onChange
  }) => {
    const [state, showMore] = useBrandEvents(brandSlug);
    if (state.status === "error") {
      return /* @__PURE__ */ wp.element.createElement(Notice, { status: "error", isDismissible: false }, state.brandMissing ? __2("We couldn't find that brand page. Check the link and try again.", "ticket-fairy-events") : __2("We couldn't load your events. Check your connection and try again.", "ticket-fairy-events"));
    }
    const events = state.status === "idle" ? [] : state.events;
    const selected = events.find((event) => event.eventSlug === value);
    if (state.status === "ready" && events.length === 0) {
      return /* @__PURE__ */ wp.element.createElement("p", null, __2("This brand has no upcoming events on sale.", "ticket-fairy-events"));
    }
    return /* @__PURE__ */ wp.element.createElement("div", { className: "ticket-fairy-event-picker" }, /* @__PURE__ */ wp.element.createElement(
      SelectControl,
      {
        label: __2("Event", "ticket-fairy-events"),
        value,
        onChange,
        options: [
          { value: "", label: __2("Choose an event", "ticket-fairy-events") },
          ...events.map((event) => ({ value: event.eventSlug, label: event.name }))
        ],
        help: selected ? describeEvent(selected) : void 0,
        __nextHasNoMarginBottom: true
      }
    ), state.status === "loading" && /* @__PURE__ */ wp.element.createElement(Spinner, null), state.status === "ready" && state.hasMore && events.length >= EVENTS_PER_PAGE && /* @__PURE__ */ wp.element.createElement(Button, { variant: "link", onClick: showMore }, __2("Show more events", "ticket-fairy-events")));
  };
  var previewText = ({ show, link, event, label }) => {
    const parsed = parseTicketFairyLink(link);
    if (parsed.kind === "invalid" || linkProblem(link, show)) {
      return null;
    }
    if (show === "listing") {
      return __2("Your upcoming events, with tickets on sale on this page.", "ticket-fairy-events");
    }
    const eventSlug = parsed.kind === "event" ? parsed.eventSlug : event;
    if (!eventSlug) {
      return null;
    }
    const eventLink = `ticketfairy.com/event/${eventSlug}`;
    if (show === "button") {
      return sprintf(
        /* translators: 1: text on the button, 2: event page link */
        __2('A "%1$s" button for %2$s.', "ticket-fairy-events"),
        label || __2("Buy tickets", "ticket-fairy-events"),
        eventLink
      );
    }
    return sprintf(__2("%1$s for %2$s.", "ticket-fairy-events"), typeLabel(show), eventLink);
  };
  var Edit = ({ attributes, setAttributes }) => {
    const { link, show, event, label, embedKey } = attributes;
    const blockProps = useBlockProps();
    const parsed = parseTicketFairyLink(link);
    const problem = linkProblem(link, show);
    const needsEventChoice = !problem && parsed.kind === "brand" && show !== "listing";
    const preview = previewText(attributes);
    const linkField = /* @__PURE__ */ wp.element.createElement(
      TextControl,
      {
        label: __2("Ticket Fairy link", "ticket-fairy-events"),
        help: __2(
          "Enter your event page link, or your brand page link to choose from your events.",
          "ticket-fairy-events"
        ),
        value: link,
        placeholder: "https://www.ticketfairy.com/event/\u2026",
        onChange: (next) => setAttributes({ link: next, event: "" }),
        __nextHasNoMarginBottom: true
      }
    );
    const settings = /* @__PURE__ */ wp.element.createElement(InspectorControls, null, /* @__PURE__ */ wp.element.createElement(PanelBody, { title: __2("Tickets", "ticket-fairy-events") }, linkField, problem && /* @__PURE__ */ wp.element.createElement(Notice, { status: "warning", isDismissible: false }, problem), /* @__PURE__ */ wp.element.createElement(
      SelectControl,
      {
        label: __2("What to show", "ticket-fairy-events"),
        value: show,
        options: showOptions(),
        onChange: (next) => setAttributes({ show: next }),
        __nextHasNoMarginBottom: true
      }
    ), needsEventChoice && parsed.kind === "brand" && /* @__PURE__ */ wp.element.createElement(
      EventPicker,
      {
        key: parsed.brandSlug,
        brandSlug: parsed.brandSlug,
        value: event,
        onChange: (next) => setAttributes({ event: next })
      }
    ), show === "button" && /* @__PURE__ */ wp.element.createElement(
      TextControl,
      {
        label: __2("Button text", "ticket-fairy-events"),
        value: label,
        placeholder: __2("Buy tickets", "ticket-fairy-events"),
        onChange: (next) => setAttributes({ label: next }),
        __nextHasNoMarginBottom: true
      }
    )));
    const advancedSettings = /* @__PURE__ */ wp.element.createElement(InspectorControls, { group: "advanced" }, /* @__PURE__ */ wp.element.createElement(
      TextControl,
      {
        label: __2("Embed key (optional)", "ticket-fairy-events"),
        help: __2(
          "From Embed on your website in your Ticket Fairy dashboard. Only needed for saved colours and allowed websites.",
          "ticket-fairy-events"
        ),
        value: embedKey,
        onChange: (next) => setAttributes({ embedKey: next.trim() }),
        __nextHasNoMarginBottom: true
      }
    ));
    if (!preview) {
      return /* @__PURE__ */ wp.element.createElement("div", { ...blockProps }, settings, advancedSettings, /* @__PURE__ */ wp.element.createElement(
        Placeholder,
        {
          icon: "tickets-alt",
          label: __2("Ticket Fairy Tickets", "ticket-fairy-events"),
          instructions: needsEventChoice ? __2("Choose an event in the block settings.", "ticket-fairy-events") : __2(
            "Enter the link to your Ticket Fairy event page or brand page. You can copy it from your browser when you view the page.",
            "ticket-fairy-events"
          )
        },
        needsEventChoice && parsed.kind === "brand" ? /* @__PURE__ */ wp.element.createElement(
          EventPicker,
          {
            key: parsed.brandSlug,
            brandSlug: parsed.brandSlug,
            value: event,
            onChange: (next) => setAttributes({ event: next })
          }
        ) : /* @__PURE__ */ wp.element.createElement("div", { className: "ticket-fairy-placeholder-fields" }, linkField, problem && /* @__PURE__ */ wp.element.createElement(Notice, { status: "warning", isDismissible: false }, problem))
      ));
    }
    return /* @__PURE__ */ wp.element.createElement("div", { ...blockProps }, settings, advancedSettings, /* @__PURE__ */ wp.element.createElement("div", { className: "ticket-fairy-preview" }, /* @__PURE__ */ wp.element.createElement("strong", null, __2("Ticket Fairy Tickets", "ticket-fairy-events")), /* @__PURE__ */ wp.element.createElement("p", null, preview), /* @__PURE__ */ wp.element.createElement("p", { className: "ticket-fairy-preview__hint" }, __2("Visitors see the live tickets when you preview or publish the page.", "ticket-fairy-events"), " ", parsed.kind !== "invalid" && /* @__PURE__ */ wp.element.createElement(ExternalLink, { href: link.startsWith("http") ? link : `https://${link}` }, __2("Open your Ticket Fairy page", "ticket-fairy-events")))));
  };
  registerBlockType("ticket-fairy/tickets", {
    edit: Edit,
    // Rendered by PHP, so the saved post holds only the block's settings.
    save: () => null,
    variations: blockVariations()
  });
})();
