=== Ticket Fairy Events ===

Contributors: reinier92tf
Tags: ticketfairy, event, venue, ticketing
Requires at least: 5.2
Tested up to: 7.2
Stable tag: 1.1.0
License: GPLv2 or later
License URI: http://www.gnu.org/licenses/gpl-2.0.txt

Display Ticket Fairy events using Wordpress Shortcodes

== Description ==

Display Ticket Fairy events using Wordpress Shortcodes

== Installation ==

1. Upload the plugin folder to your /wp-content/plugins/ folder.
1. Go to the **Plugins** page and activate the plugin.

== Frequently Asked Questions ==

= How do I use this plugin? =

Insert a new Shortcode block into a page and pass your brand and/or venue ids
`[ttf_events_list brand=XXXX venue=XXXX]`

= How to uninstall the plugin? =

Simply deactivate and delete the plugin.

== Changelog ==
= 1.0 =
* Plugin released. 

= 1.0.1 =
* Fix duplicates.

= 1.0.2 =
* Add classes for js and css customization support

= 1.1.0 =
* **Breaking:** CSS classes renamed with `ttf-` prefix (`event-box` → `ttf-event-box`, `event-image` → `ttf-event-image`, `event-data` → `ttf-event-data`, `event-title` → `ttf-event-title`, `event-date` → `ttf-event-date`, `event-link` → `ttf-event-link`). Utility classes (`d-flex`, `w-100`, etc.) are now scoped under `.ttf-events`. Update any custom theme styles targeting these classes.
* **Breaking:** Hidden inputs `#brand-id` and `#venue-id` removed. If you reference these in external JS, update accordingly.
* Fix XSS vulnerability in shortcode attributes
* Fix XSS vulnerability in API response rendering
* Validate ticket link URL scheme (only `http(s)` allowed)
* Fix mismatched HTML tags
* Register scripts and styles via `wp_enqueue_scripts` so jQuery loads before plugin code; consolidate per-instance inline assets
* Support multiple shortcode instances on the same page
* Show error message only when all requests fail (no more partial-failure double-banner)
* Add `alt` text to event flyer images
* Replace nested `<button>` inside `<a>` with a styled anchor
* Wrap JS in IIFE to prevent global scope pollution
* Add error and empty state messages
* Remove debug console.log calls
