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

add_shortcode('ttf_events_list', 'ttf_events_list');

function ttf_events_list($args = [], $content = null): string
{
    wp_enqueue_script('jquery');
    static $instance = 0;
    $instance++;

    $brandId = esc_attr($args["brand"] ?? '');
    $venueId = esc_attr($args["venue"] ?? '');

    $containerId = 'ttf-events-' . $instance;

    return '
<div id="' . $containerId . '">
    <div class="ttf-events-list"></div>
</div>

<script>
(function($) {
    var ENDPOINT = "https://www.theticketfairy.com/api/public/filtered-events";
    var brandId = ' . wp_json_encode($brandId) . ';
    var venueId = ' . wp_json_encode($venueId) . ';
    var container = $("#' . $containerId . '");
    var currEvents = [];
    var currEventIds = new Set();

    function processResponse(responseObj) {
        mergeEvents(responseObj.data || []);
    }

    function mergeEvents(newEvents) {
        var prevSize = currEventIds.size;

        $.each(newEvents, function(idx, event) {
            if (!currEventIds.has(event.id)) {
                currEventIds.add(event.id);
                currEvents.push(event);
            }
        });

        if (currEventIds.size > prevSize) {
            renderEvents();
        }
    }

    function renderEvents() {
        var listNode = container.find(".ttf-events-list");

        currEvents.sort(function(x, y) {
            return (x.date < y.date) ? -1 : 1;
        });

        listNode.empty();

        if (currEvents.length === 0) {
            listNode.append("<p>No events found.</p>");
            return;
        }

        $.each(currEvents, function(idx, event) {
            listNode.append(getEventHtmlNode(event));
        });
    }

    function getEventHtmlNode(event) {
        var options = {
            weekday: "long", year: "numeric", month: "long", day: "numeric",
            hour: "numeric", minute: "numeric"
        };
        var locale = navigator.language || navigator.userLanguage;
        var dateFormatter = new Intl.DateTimeFormat(locale, options);

        var startTs = Date.parse(event.date);
        var startDatetime = isNaN(startTs) ? "TBC" : dateFormatter.format(startTs);
        var endTs = Date.parse(event.end_date);
        var endDatetime = isNaN(endTs) ? "TBC" : dateFormatter.format(endTs);

        var box = $("<div class=\"ttf-event-box d-flex mx-auto flex-column flex-md-row\"></div>");

        var img = $("<img class=\"w-100\">").attr("src", event.flyer_image);
        var imageWrap = $("<div class=\"ttf-event-image w-100 w-md-30\"></div>").append(img);

        var dataWrap = $("<div class=\"ttf-event-data d-flex flex-column w-100 w-md-60\"></div>");
        dataWrap.append($("<h2 class=\"ttf-event-title\"></h2>").append($("<strong></strong>").text(event.name)));
        dataWrap.append($("<h4 class=\"ttf-event-date\"></h4>").text("From: " + startDatetime));
        dataWrap.append($("<h4 class=\"ttf-event-date\"></h4>").text("To: " + endDatetime));

        var safeHref = "#";
        try {
            var parsed = new URL(event.url, window.location.origin);
            if (/^https?:$/.test(parsed.protocol)) safeHref = parsed.href;
        } catch (e) {}

        var btn = $("<button></button>").text("Get Tickets");
        var link = $("<a class=\"ttf-event-link\"></a>").attr("href", safeHref).attr("target", "_blank").attr("rel", "noopener noreferrer").append(btn);
        dataWrap.append(link);

        box.append(imageWrap).append(dataWrap);
        return box;
    }

    $(document).ready(function() {
        if (brandId.length > 0) {
            $.get(ENDPOINT, { filters: { item_type: "brand", item_id: brandId } })
                .done(processResponse)
                .fail(function() { container.find(".ttf-events-list").append("<p>Unable to load events.</p>"); });
        }

        if (venueId.length > 0) {
            $.get(ENDPOINT, { filters: { item_type: "venue", item_id: venueId } })
                .done(processResponse)
                .fail(function() { container.find(".ttf-events-list").append("<p>Unable to load events.</p>"); });
        }

        if (brandId.length === 0 && venueId.length === 0) {
            container.find(".ttf-events-list").append("<p>No events found.</p>");
        }
    });
})(jQuery);
</script>

<style>
    .d-flex {
        display: flex;
    }

    .flex-column {
        flex-direction: column;
    }

    .w-100 {
        width: 100% !important;
    }

    .mx-auto {
        margin-left: auto !important;
        margin-right: auto !important;
    }

    .ttf-event-box {
        justify-content: space-around;
        margin-bottom: 2rem;
    }

    @media(min-width: 768px) {
        .flex-md-row {
            flex-direction: row !important;
        }

        .w-md-30 {
            width: 30% !important;
        }

        .w-md-60 {
            width: 60% !important;
        }

        .ttf-event-title {
            margin-top: 2rem;
        }

        .ttf-event-date {
            margin-top: 1.25rem;
        }

        .ttf-event-link {
            margin-top: 1.5rem;
        }
    }
</style>
';
}
