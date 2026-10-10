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
 * Description:       Sell Ticket Fairy tickets on your site: a Buy tickets button, the full checkout, your event list, set times or line-up. No code needed.
 * Version:           2.0.0
 * Requires at least: 6.1
 * Requires PHP:      7.4
 * Author:            Ticket Fairy
 * Author URI:        https://www.ticketfairy.com/
 * Text Domain:       ticket-fairy-events
 * License:           GPL v2 or later
 * License URI:       http://www.gnu.org/licenses/gpl-2.0.txt
 */

namespace TicketFairy\Events;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

require_once __DIR__ . '/includes/class-embed.php';
require_once __DIR__ . '/includes/legacy-events-list.php';

/**
 * [ticketfairy link="https://www.ticketfairy.com/event/..." show="button" label="Get tickets"]
 *
 * `show` is one of: button, checkout, event-list, set-times, line-up.
 * `event` picks an event when `link` is a brand page link.
 * `key` is an optional embed key from the Ticket Fairy dashboard.
 *
 * @param array|string $atts Shortcode attributes.
 * @return string
 */
function render_shortcode( $atts ) {
	$atts = shortcode_atts(
		array(
			'link'  => '',
			'show'  => 'button',
			'event' => '',
			'label' => '',
			'key'   => '',
		),
		$atts,
		'ticketfairy'
	);

	$show = strtolower( trim( $atts['show'] ) );
	$type = isset( Embed::SHORTCODE_TYPES[ $show ] ) ? Embed::SHORTCODE_TYPES[ $show ] : $show;

	return Embed::render(
		array(
			'type'  => $type,
			'link'  => $atts['link'],
			'event' => $atts['event'],
			'label' => $atts['label'],
			'key'   => $atts['key'],
		)
	);
}
add_shortcode( 'ticketfairy', __NAMESPACE__ . '\render_shortcode' );

/**
 * Block attributes use the same names as the shortcode settings.
 *
 * @param array $attributes Block attributes from block.json.
 * @return string
 */
function render_block( $attributes ) {
	return Embed::render(
		array(
			'type'  => isset( $attributes['show'] ) ? $attributes['show'] : 'button',
			'link'  => isset( $attributes['link'] ) ? $attributes['link'] : '',
			'event' => isset( $attributes['event'] ) ? $attributes['event'] : '',
			'label' => isset( $attributes['label'] ) ? $attributes['label'] : '',
			'key'   => isset( $attributes['embedKey'] ) ? $attributes['embedKey'] : '',
		)
	);
}

function register_block() {
	register_block_type(
		__DIR__ . '/block',
		array( 'render_callback' => __NAMESPACE__ . '\render_block' )
	);

	wp_set_script_translations( 'ticket-fairy-tickets-editor-script', 'ticket-fairy-events' );
}
add_action( 'init', __NAMESPACE__ . '\register_block' );

add_filter( 'script_loader_tag', array( Embed::class, 'add_async_attribute' ), 10, 2 );
