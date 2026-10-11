/**
 * [ttf_events_list] — lists a brand's or venue's upcoming events with a link
 * to each event page. Every shortcode on the page gets its own list.
 *
 * The markup and class names are unchanged from version 1.0.5, because
 * sites style and script them.
 */
(function () {
	var EVENTS_ENDPOINT = 'https://www.theticketfairy.com/api/public/filtered-events'

	function fetchEvents(itemType, itemId) {
		var queryString = new URLSearchParams({
			'filters[item_type]': itemType,
			'filters[item_id]': itemId,
			'filters[upcoming]': 'true',
		}).toString()

		return fetch(EVENTS_ENDPOINT + '?' + queryString).then(function (response) {
			if (!response.ok) {
				throw new Error('Network response was not ok')
			}

			return response.json()
		})
	}

	function getEventHtmlNode(event) {
		var options = {
			weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
			hour: 'numeric', minute: 'numeric',
		}
		var locale = navigator.language || navigator.userLanguage
		var dateFormatter = new Intl.DateTimeFormat(locale, options)

		var startDatetime = dateFormatter.format(Date.parse(event.date))
		var endDatetime = dateFormatter.format(Date.parse(event.end_date))

		var wrapper = document.createElement('div')
		wrapper.className = 'event-box d-flex mx-auto flex-column flex-md-row'

		var imageContainer = document.createElement('div')
		imageContainer.className = 'event-image w-100 w-md-30'

		var imageLink = document.createElement('a')
		imageLink.href = event.url
		imageLink.target = '_blank'
		imageLink.rel = 'noopener noreferrer'

		var image = document.createElement('img')
		image.className = 'w-100'
		image.src = event.flyer_image
		image.alt = event.name
		imageLink.appendChild(image)
		imageContainer.appendChild(imageLink)

		var dataContainer = document.createElement('div')
		dataContainer.className = 'event-data d-flex flex-column w-100 w-md-60'

		var title = document.createElement('h2')
		title.className = 'event-title'
		var titleStrong = document.createElement('strong')
		titleStrong.textContent = event.name
		title.appendChild(titleStrong)

		var startDate = document.createElement('h4')
		startDate.className = 'event-date'
		startDate.textContent = 'From: ' + startDatetime

		var endDate = document.createElement('h4')
		endDate.className = 'event-date'
		endDate.textContent = 'To: ' + endDatetime

		var eventLink = document.createElement('a')
		eventLink.className = 'event-link'
		eventLink.href = event.url
		eventLink.target = '_blank'
		eventLink.rel = 'noopener noreferrer'

		var linkButton = document.createElement('button')
		linkButton.type = 'button'
		linkButton.textContent = 'Get Tickets'
		eventLink.appendChild(linkButton)

		dataContainer.appendChild(title)
		dataContainer.appendChild(startDate)
		dataContainer.appendChild(endDate)
		dataContainer.appendChild(eventLink)

		wrapper.appendChild(imageContainer)
		wrapper.appendChild(dataContainer)

		return wrapper
	}

	function showList(container) {
		var eventsListNode = container.querySelector('.ttf-events-list__events')
		var events = []
		var eventIds = new Set()

		function mergeEvents(responseObj) {
			var prevSize = eventIds.size

			responseObj.data.forEach(function (event) {
				if (!eventIds.has(event.id)) {
					eventIds.add(event.id)
					events.push(event)
				}
			})

			if (eventIds.size === prevSize) {
				return
			}

			events.sort(function (x, y) {
				return x.date < y.date ? -1 : 1
			})

			eventsListNode.innerHTML = ''
			events.forEach(function (event) {
				eventsListNode.appendChild(getEventHtmlNode(event))
			})
		}

		function load(itemType, itemId) {
			if (!itemId) {
				return
			}

			fetchEvents(itemType, itemId)
				.then(mergeEvents)
				.catch(function (error) {
					console.log('Error getting events list:', error)
				})
		}

		load('brand', container.getAttribute('data-brand') || '')
		load('venue', container.getAttribute('data-venue') || '')
	}

	function showAllLists() {
		document.querySelectorAll('.ttf-events-list').forEach(showList)
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', showAllLists)
	} else {
		showAllLists()
	}
})()
