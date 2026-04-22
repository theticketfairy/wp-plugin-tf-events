<?php

/**
 * Ticket Fairy Events
 *
 * @package           TicketFairyEvents
 * @author            Ticket Fairy
 * @copyright         2021 Ticket Fairy
 * @license           GPL-2.0-or-later
 *
 * @wordpress-plugin
 * Plugin Name:       Ticket Fairy Events
 * Plugin URI:        https://github.com/theticketfairy/wp-plugin-tf-events
 * Description:       Display Ticket Fairy events using Wordpress Shortcodes
 * Version:           1.1.0
 * Requires at least: 5.2
 * Requires PHP:      7.2
 * Author:            Ticket Fairy
 * Author URI:        https://www.ticketfairy.com/
 * Text Domain:       events
 * License:           GPL v2 or later
 * License URI:       http://www.gnu.org/licenses/gpl-2.0.txt
 * Update URI:        https://github.com/theticketfairy/wp-plugin-tf-events
 */

define('TTF_EVENTS_VERSION', '1.1.0');

add_action('wp_enqueue_scripts', 'ttf_events_register_assets');
add_shortcode('ttf_events_list', 'ttf_events_list');

function ttf_events_register_assets(): void
{
    wp_register_script('ttf-events', false, ['jquery'], TTF_EVENTS_VERSION, true);
    wp_register_style('ttf-events', false, [], TTF_EVENTS_VERSION);
    wp_add_inline_script('ttf-events', ttf_events_inline_js());
    wp_add_inline_style('ttf-events', ttf_events_inline_css());
}

function ttf_events_list($args = [], $content = null): string
{
    wp_enqueue_script('ttf-events');
    wp_enqueue_style('ttf-events');

    $brandId = $args['brand'] ?? '';
    $venueId = $args['venue'] ?? '';

    return sprintf(
        '<div class="ttf-events" data-brand="%s" data-venue="%s"><div class="ttf-events-list"></div></div>',
        esc_attr($brandId),
        esc_attr($venueId)
    );
}

function ttf_events_inline_css(): string
{
    return <<<CSS
.ttf-events .d-flex { display: flex; }
.ttf-events .flex-column { flex-direction: column; }
.ttf-events .w-100 { width: 100% !important; }
.ttf-events .mx-auto { margin-left: auto !important; margin-right: auto !important; }
.ttf-event-box { justify-content: space-around; margin-bottom: 2rem; }
.ttf-event-link { display: inline-block; padding: 0.5rem 1rem; text-decoration: none; border: 1px solid currentColor; }
@media (min-width: 768px) {
    .ttf-events .flex-md-row { flex-direction: row !important; }
    .ttf-events .w-md-30 { width: 30% !important; }
    .ttf-events .w-md-60 { width: 60% !important; }
    .ttf-event-title { margin-top: 2rem; }
    .ttf-event-date { margin-top: 1.25rem; }
    .ttf-event-link { margin-top: 1.5rem; }
}
CSS;
}

function ttf_events_inline_js(): string
{
    return <<<'JS'
(function($) {
    var ENDPOINT = "https://www.theticketfairy.com/api/public/filtered-events";

    function init($container) {
        if ($container.data("ttfInit")) return;
        $container.data("ttfInit", true);

        var brandId = String($container.data("brand") || "");
        var venueId = String($container.data("venue") || "");
        var $list = $container.find(".ttf-events-list");
        var currEvents = [];
        var currEventIds = new Set();
        var pending = 0;
        var receivedAny = false;

        function mergeEvents(newEvents) {
            var prevSize = currEventIds.size;
            $.each(newEvents, function(idx, evt) {
                if (!currEventIds.has(evt.id)) {
                    currEventIds.add(evt.id);
                    currEvents.push(evt);
                }
            });
            if (currEventIds.size > prevSize) render();
        }

        function render() {
            currEvents.sort(function(x, y) { return (x.date < y.date) ? -1 : 1; });
            $list.empty();
            if (currEvents.length === 0) {
                $list.append($("<p></p>").text("No events found."));
                return;
            }
            $.each(currEvents, function(idx, evt) {
                $list.append(buildEventNode(evt));
            });
        }

        function buildEventNode(evt) {
            var options = {
                weekday: "long", year: "numeric", month: "long", day: "numeric",
                hour: "numeric", minute: "numeric"
            };
            var locale = navigator.language || navigator.userLanguage;
            var fmt = new Intl.DateTimeFormat(locale, options);
            var startTs = Date.parse(evt.date);
            var endTs = Date.parse(evt.end_date);
            var start = isNaN(startTs) ? "TBC" : fmt.format(startTs);
            var end = isNaN(endTs) ? "TBC" : fmt.format(endTs);

            var $box = $("<div class=\"ttf-event-box d-flex mx-auto flex-column flex-md-row\"></div>");

            var $img = $("<img class=\"w-100\">")
                .attr("src", evt.flyer_image)
                .attr("alt", evt.name || "");
            var $imageWrap = $("<div class=\"ttf-event-image w-100 w-md-30\"></div>").append($img);

            var $dataWrap = $("<div class=\"ttf-event-data d-flex flex-column w-100 w-md-60\"></div>");
            $dataWrap.append($("<h2 class=\"ttf-event-title\"></h2>").append($("<strong></strong>").text(evt.name || "")));
            $dataWrap.append($("<h4 class=\"ttf-event-date\"></h4>").text("From: " + start));
            $dataWrap.append($("<h4 class=\"ttf-event-date\"></h4>").text("To: " + end));

            var safeHref = null;
            try {
                var parsed = new URL(evt.url, window.location.origin);
                if (/^https?:$/.test(parsed.protocol)) safeHref = parsed.href;
            } catch (e) {}

            if (safeHref) {
                $dataWrap.append(
                    $("<a class=\"ttf-event-link\"></a>")
                        .attr("href", safeHref)
                        .attr("target", "_blank")
                        .attr("rel", "noopener noreferrer")
                        .text("Get Tickets")
                );
            }

            $box.append($imageWrap).append($dataWrap);
            return $box;
        }

        function load(type, id) {
            pending++;
            $.get(ENDPOINT, { filters: { item_type: type, item_id: id } })
                .done(function(resp) {
                    receivedAny = true;
                    mergeEvents((resp && resp.data) || []);
                })
                .always(function() {
                    pending--;
                    if (pending === 0 && !receivedAny && currEvents.length === 0) {
                        $list.empty().append($("<p></p>").text("Unable to load events."));
                    }
                });
        }

        if (brandId.length === 0 && venueId.length === 0) {
            $list.append($("<p></p>").text("No events found."));
            return;
        }

        if (brandId.length > 0) load("brand", brandId);
        if (venueId.length > 0) load("venue", venueId);
    }

    $(function() {
        $(".ttf-events").each(function() { init($(this)); });
    });
})(jQuery);
JS;
}
