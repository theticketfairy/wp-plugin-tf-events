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

	// Shortcodes outside the post content (widgets, templates) get the styles
	// here. WordPress then prints them in the footer, because the head is done.
	enqueue_events_list_style();
	wp_enqueue_script( 'ticket-fairy-events-list', plugin_dir_url( __DIR__ ) . 'assets/legacy-events-list.js', array(), '2.0.0', true );

	// The hidden fields and the events-list id are the 1.0.5 markup, which
	// site scripts and styles may still use.
	return '<div class="ttf-events-list" data-brand="' . esc_attr( $atts['brand'] ) . '" data-venue="' . esc_attr( $atts['venue'] ) . '">'
		. '<input type="hidden" id="brand-id" value="' . esc_attr( $atts['brand'] ) . '">'
		. '<input type="hidden" id="venue-id" value="' . esc_attr( $atts['venue'] ) . '">'
		. '<div id="events-list" class="ttf-events-list__events"></div>'
		. '</div>';
}
add_shortcode( 'ttf_events_list', __NAMESPACE__ . '\render_events_list' );

function enqueue_events_list_style() {
	wp_enqueue_style( 'ticket-fairy-events-list', plugin_dir_url( __DIR__ ) . 'assets/legacy-events-list.css', array(), '2.0.0' );
}

/**
 * Loads the list styles in the head when the post content has the shortcode,
 * as the inline styles of version 1.0.5 did. Shortcodes run after the head is
 * printed, so enqueuing only from the shortcode would load them late.
 */
function enqueue_events_list_style_for_post() {
	$post = get_post();

	if ( $post && has_shortcode( $post->post_content, 'ttf_events_list' ) ) {
		enqueue_events_list_style();
	}
}
add_action( 'wp_enqueue_scripts', __NAMESPACE__ . '\enqueue_events_list_style_for_post' );
