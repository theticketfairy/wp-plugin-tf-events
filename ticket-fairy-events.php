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
 * Version:           1.0.2
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
    $brandId = $args["brand"] ?? '';
    $venueId = $args["venue"] ?? '';

    return '
<div>
    <input type="hidden" id="brand-id" value="'. $brandId .'">
    <input type="hidden" id="venue-id" value="'. $venueId .'">
    
    <div id="events-list">
    </div>
</div>

<script>
    const event_endpoint = "https://www.theticketfairy.com/api/public/filtered-events"

    let currEvents = [];
    let currEventIds = new Set();
    
    $(document).ready(function() {
        const brandId = $("#brand-id").val()
        const venueId = $("#venue-id").val()
        
        const params_brand_req = {
            filters: {
                item_type: "brand",
                item_id: brandId
            }
        }
        
        const params_venue_req = {
            filters: {
                item_type: "venue",
                item_id: venueId
            }
        }

        if (brandId.length > 0) {
            $.get(event_endpoint, params_brand_req)
            .done(process_events_response)
            .fail(function(data) {
                console.log("Error getting events list: " + data)
                })
        }
            
        if (venueId.length > 0) {
            $.get(event_endpoint, params_venue_req)
            .done(process_events_response)
            .fail(function(data) {
                console.log("Error getting events list: " + data)
                })
        }
    })
    
    function process_events_response(responseObj) {
        mergeEvents(responseObj.data);
    }
    
    function mergeEvents(newEvents) {
        const prevSize = currEventIds.size
        
        $.each(newEvents, function(idx, event) {
            if ( !currEventIds.has(event.id) ) {
                currEventIds.add(event.id)
                currEvents.push(event)
            }
        })
        
        if (currEventIds.size > prevSize) {
            renderEvents();
        }
    }
    
    function renderEvents() {
        const eventsListNode = $("#events-list")
        
        eventsListNode.empty();
        
        $.each(currEvents, function (idx, event) {
            const newNode = getEventHtmlNode(event)
            eventsListNode.append(newNode)
        })
    }
    
    function getEventHtmlNode(event) {
        const options = {
            weekday: "long", year: "numeric", month: "long", day: "numeric",
            hour: "numeric", minute: "numeric",
        }
        const locale = navigator.language || navigator.userLanguage;
        const dateFormatter = new Intl.DateTimeFormat(locale, options)
        
        let startDatetime = Date.parse(event.date)
        startDatetime = dateFormatter.format(startDatetime)
        
        let endDatetime = Date.parse(event.end_date)
        endDatetime = dateFormatter.format(endDatetime)
        
        return $(`<div class="event-box d-flex mx-auto flex-column flex-md-row"></div>`)
            .append( $(`<div class="event-image w-100 w-md-30">
                            <img class="w-100" src="${event.flyer_image}">
                        </div>`) )
            .append( $(`<div class="event-data d-flex flex-column w-100 w-md-60">
                            <h2 class="event-title"><strong>${event.name}</strong></h1>
                            <h4 class="event-date">From: ${startDatetime}</h4>
                            <h4 class="event-date">To: ${endDatetime}</h4>
                            <a class="event-link" href="${event.url}" target="_blank">
                                <button>Get Tickets</button>
                            </a>
                        </div>`) )
    }
    
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
    
    .event-box {
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
        
        .event-title {
        margin-top: 2rem;
        }
        
        .event-date {
        margin-top: 1.25rem;
        }
        
        .event-link {
        margin-top: 1.5rem;
        }
    }
</style>
';
}
