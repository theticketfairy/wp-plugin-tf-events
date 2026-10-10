<?php
/**
 * [ttf_events_list brand=XXXX venue=XXXX] — the plugin's original shortcode.
 *
 * Kept for sites that already use it: it lists upcoming events with a link to
 * each event page, with the same markup and class names as version 1.0.5.
 * New pages use the Ticket Fairy Tickets block or the [ticketfairy]
 * shortcode, which sell tickets on the page instead of linking away.
 *
 * @package TicketFairyEvents
 */

namespace TicketFairy\Events;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * @param array|string $atts Shortcode attributes: brand and venue ids.
 * @return string
 */
function render_events_list( $atts ) {
	$atts = shortcode_atts(
		array(
			'brand' => '',
			'venue' => '',
		),
		$atts,
		'ttf_events_list'
	);

	$assets = plugin_dir_url( __DIR__ ) . 'assets/';
	wp_enqueue_style( 'ticket-fairy-events-list', $assets . 'legacy-events-list.css', array(), '2.0.0' );
	wp_enqueue_script( 'ticket-fairy-events-list', $assets . 'legacy-events-list.js', array(), '2.0.0', true );

	// The hidden fields and the events-list id are the 1.0.5 markup, which
	// site scripts and styles may still use.
	return '<div class="ttf-events-list" data-brand="' . esc_attr( $atts['brand'] ) . '" data-venue="' . esc_attr( $atts['venue'] ) . '">'
		. '<input type="hidden" id="brand-id" value="' . esc_attr( $atts['brand'] ) . '">'
		. '<input type="hidden" id="venue-id" value="' . esc_attr( $atts['venue'] ) . '">'
		. '<div id="events-list" class="ttf-events-list__events"></div>'
		. '</div>';
}
add_shortcode( 'ttf_events_list', __NAMESPACE__ . '\render_events_list' );
