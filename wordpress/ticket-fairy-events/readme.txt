=== Ticket Fairy Events ===
Contributors: reinier92tf, ash-ticketfairy
Tags: tickets, events, ticketing, checkout, event registration
Requires at least: 6.1
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 2.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Sell your Ticket Fairy tickets on your own site: a Buy tickets button, the full checkout, your event list, set times or line-up. No code needed.

== Description ==

Ticket Fairy Events puts your Ticket Fairy ticket sales on your WordPress site. Your buyers choose tickets and pay without leaving your page.

Add the **Ticket Fairy Tickets** block to any page or post, enter the link to your Ticket Fairy event page or brand page, and choose what to show:

* **Buy tickets button**: a button that opens the checkout over your page.
* **Checkout on the page**: ticket choice and payment, right on your page.
* **Your event list**: all your upcoming events, with tickets on sale on your page.
* **Set times**: who plays when, by day and stage.
* **Line-up**: the acts, with photos and links.

If you enter your brand page link, the block lists your upcoming events so you can choose one.

Everything your buyers see comes from Ticket Fairy, so it always matches your event: ticket types, add-ons, promo codes, payment plans, reserved seating, Apple Pay and Google Pay, and your tracking pixels. Promoter links keep working, so promoters get credit for their sales.

You need a Ticket Fairy account with at least one event. Creating events and selling tickets is set up in your Ticket Fairy dashboard at https://www.theticketfairy.com.

= Shortcode =

If your theme or page builder does not use blocks, use the shortcode:

`[ticketfairy link="https://www.ticketfairy.com/event/your-event"]`

Options:

* `show`: `button` (the default), `checkout`, `event-list`, `set-times` or `line-up`.
* `label`: the text on the button, for example `label="Get tickets"`.
* `event`: when `link` is your brand page link, the web address name of one event, for example `event="summer-party"`.
* `key`: an embed key from **Embed on your website** in your Ticket Fairy dashboard. Only needed for saved colours and allowed websites.

The original `[ttf_events_list brand=XXXX venue=XXXX]` shortcode still works.

== External services ==

This plugin connects to Ticket Fairy (https://www.ticketfairy.com), the ticketing service that sells your tickets.

* **On pages that show a Ticket Fairy block or shortcode**, your visitors' browsers load the Ticket Fairy embed script from https://www.ticketfairy.com/resources/js/event-embed.js. It shows your tickets and checkout in a frame served by Ticket Fairy. When a visitor buys tickets, the details they enter (such as their name, email address and payment details) go to Ticket Fairy and its payment providers, not to your WordPress site.
* **In the block editor**, when you enter a brand page link, your browser asks https://www.ticketfairy.com/api/embed/events/ for your brand's upcoming public events, so you can choose one. No personal data is sent.
* **The original `[ttf_events_list]` shortcode** asks https://www.theticketfairy.com/api/public/filtered-events for the brand's or venue's upcoming public events.

Terms of service: https://www.ticketfairy.com/terms
Privacy policy: https://www.ticketfairy.com/privacy

== Installation ==

1. In your WordPress dashboard, go to **Plugins > Add New Plugin** and search for "Ticket Fairy".
2. Select **Install Now**, then **Activate**.
3. Edit a page, add the **Ticket Fairy Tickets** block and enter your Ticket Fairy link.

== Frequently Asked Questions ==

= Where do I find my Ticket Fairy link? =

Open your event page on ticketfairy.com and copy the address from your browser. It looks like `https://www.ticketfairy.com/event/your-event`. Your brand page, with all your events, looks like `https://www.ticketfairy.com/events/your-brand`.

= Why don't I see the checkout in the editor? =

The editor shows a card that says what your visitors will see. Preview or publish the page to see the live tickets.

= My event doesn't appear in the list =

The list shows upcoming events that are on sale to the public. Check that the event is published in your Ticket Fairy dashboard.

= Can I change the colours? =

Yes. In your Ticket Fairy dashboard, go to **Embed on your website**, create an embed with your colours and copy its embed key. In the block, open **Advanced** and enter the key.

= Do I need a paid plan? =

No. Selling tickets on your own site with this plugin is free. Your usual Ticket Fairy ticket fees apply.

= Who processes payments? =

Ticket Fairy and your payment provider, exactly as on your Ticket Fairy event page. Your WordPress site never handles card details.

== Screenshots ==

1. The checkout on a WordPress page.
2. The Ticket Fairy Tickets block settings, with an event chosen from a brand's events.

== Changelog ==

= 2.0.0 =
* New: the Ticket Fairy Tickets block. Sell tickets on your page with a Buy tickets button, the checkout, your event list, set times or line-up.
* New: choose an event from your brand's upcoming events.
* New: the `[ticketfairy]` shortcode.
* The original `[ttf_events_list]` shortcode is unchanged.

= 1.0.5 =
* Show upcoming events only.

= 1.0.4 =
* Replace jQuery with vanilla JavaScript, added link to poster.

= 1.0.2 =
* Add classes for JavaScript and CSS customisation support.

= 1.0.1 =
* Fix duplicates.

= 1.0 =
* Plugin released.

== Upgrade Notice ==

= 2.0.0 =
Adds the Ticket Fairy Tickets block so buyers can buy tickets without leaving your site. Your existing shortcodes keep working.
