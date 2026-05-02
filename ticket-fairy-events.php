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
 * Version:           1.0.3
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
    
    document.addEventListener("DOMContentLoaded", function() {
        const brandId = document.getElementById("brand-id")?.value || ""
        const venueId = document.getElementById("venue-id")?.value || ""
        
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
            fetchEvents(params_brand_req)
        }
            
        if (venueId.length > 0) {
            fetchEvents(params_venue_req)
        }
    })

    function fetchEvents(paramsObj) {
        const queryString = new URLSearchParams({
            "filters[item_type]": paramsObj.filters.item_type,
            "filters[item_id]": paramsObj.filters.item_id
        }).toString()

        fetch(`${event_endpoint}?${queryString}`)
            .then(function(response) {
                if (!response.ok) {
                    throw new Error("Network response was not ok")
                }

                return response.json()
            })
            .then(process_events_response)
            .catch(function(error) {
                console.log("Error getting events list:", error)
            })
    }
    
    function process_events_response(responseObj) {
        mergeEvents(responseObj.data);
    }
    
    function mergeEvents(newEvents) {
        const prevSize = currEventIds.size
        
        newEvents.forEach(function(event) {
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
        const eventsListNode = document.getElementById("events-list")

        if (!eventsListNode) {
            return
        }
        
        console.log(currEvents)
        
        currEvents.sort(function (x, y) {
            return (x.date < y.date) ? -1 : 1
        })
        
        console.log(currEvents)
        
        eventsListNode.innerHTML = ""
        
        currEvents.forEach(function(event) {
            const newNode = getEventHtmlNode(event)
            eventsListNode.appendChild(newNode)
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
        
        const wrapper = document.createElement("div")
        wrapper.className = "event-box d-flex mx-auto flex-column flex-md-row"

        const imageContainer = document.createElement("div")
        imageContainer.className = "event-image w-100 w-md-30"

        const imageLink = document.createElement("a")
        imageLink.href = event.url
        imageLink.target = "_blank"
        imageLink.rel = "noopener noreferrer"

        const image = document.createElement("img")
        image.className = "w-100"
        image.src = event.flyer_image
        image.alt = event.name
        imageLink.appendChild(image)
        imageContainer.appendChild(imageLink)

        const dataContainer = document.createElement("div")
        dataContainer.className = "event-data d-flex flex-column w-100 w-md-60"

        const title = document.createElement("h2")
        title.className = "event-title"
        const titleStrong = document.createElement("strong")
        titleStrong.textContent = event.name
        title.appendChild(titleStrong)

        const startDate = document.createElement("h4")
        startDate.className = "event-date"
        startDate.textContent = `From: ${startDatetime}`

        const endDate = document.createElement("h4")
        endDate.className = "event-date"
        endDate.textContent = `To: ${endDatetime}`

        const eventLink = document.createElement("a")
        eventLink.className = "event-link"
        eventLink.href = event.url
        eventLink.target = "_blank"
        eventLink.rel = "noopener noreferrer"

        const linkButton = document.createElement("button")
        linkButton.type = "button"
        linkButton.textContent = "Get Tickets"
        eventLink.appendChild(linkButton)

        dataContainer.appendChild(title)
        dataContainer.appendChild(startDate)
        dataContainer.appendChild(endDate)
        dataContainer.appendChild(eventLink)

        wrapper.appendChild(imageContainer)
        wrapper.appendChild(dataContainer)

        return wrapper
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
