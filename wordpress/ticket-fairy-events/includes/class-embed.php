<?php
/**
 * Builds the Ticket Fairy embed placeholder for the block and the shortcode.
 *
 * The plugin only writes a `data-ttf-embed` placeholder and loads the Ticket
 * Fairy embed loader once. The loader turns the placeholder into the button,
 * checkout, event list or line-up. This file mirrors packages/core in the
 * repository root (links.ts and embeds.ts); keep the two in step.
 *
 * @package TicketFairyEvents
 */

namespace TicketFairy\Events;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Embed {

	const LOADER_URL    = 'https://www.ticketfairy.com/resources/js/event-embed.js';
	const LOADER_HANDLE = 'ticket-fairy-embed';

	const TYPES = array( 'button', 'checkout', 'listing', 'timetable', 'lineup' );

	/**
	 * Shortcode words for each type. Organisers type these, so they match the
	 * names in the block editor instead of the loader's internal names.
	 */
	const SHORTCODE_TYPES = array(
		'button'     => 'button',
		'checkout'   => 'checkout',
		'event-list' => 'listing',
		'events'     => 'listing',
		'set-times'  => 'timetable',
		'line-up'    => 'lineup',
	);

	const ACCEPTED_HOSTS = array( 'ticketfairy.com', 'www.ticketfairy.com', 'theticketfairy.com', 'www.theticketfairy.com' );

	const SLUG_PATTERN       = '/^[a-z0-9_-]+$/i';
	const WIDGET_KEY_PATTERN = '/^[a-f0-9]{64}$/';

	/**
	 * Reads an event page link (/event/<name>) or a brand page link
	 * (/events/<brand>). Returns array( 'kind' => 'event'|'brand', 'slug' => ... )
	 * or null when the link is not one of those.
	 *
	 * @param string $link Link the organiser pasted.
	 * @return array|null
	 */
	public static function parse_link( $link ) {
		$link = trim( (string) $link );

		if ( '' === $link ) {
			return null;
		}

		if ( ! preg_match( '#^[a-z][a-z0-9+.-]*://#i', $link ) ) {
			$link = 'https://' . $link;
		}

		$parts = wp_parse_url( $link );

		if ( ! is_array( $parts ) || empty( $parts['host'] ) || ! in_array( strtolower( $parts['scheme'] ), array( 'http', 'https' ), true ) ) {
			return null;
		}

		if ( ! in_array( strtolower( $parts['host'] ), self::ACCEPTED_HOSTS, true ) ) {
			return null;
		}

		$segments = array_values( array_filter( explode( '/', isset( $parts['path'] ) ? $parts['path'] : '' ), 'strlen' ) );

		if ( 2 !== count( $segments ) || ! preg_match( self::SLUG_PATTERN, $segments[1] ) ) {
			return null;
		}

		if ( 'event' === $segments[0] ) {
			return array(
				'kind' => 'event',
				'slug' => $segments[1],
			);
		}

		if ( 'events' === $segments[0] ) {
			return array(
				'kind' => 'brand',
				'slug' => $segments[1],
			);
		}

		return null;
	}

	/**
	 * Placeholder attributes, or null when the settings cannot show anything.
	 *
	 * @param array $settings Keys: type, link, event (chosen from a brand's list), label, key.
	 * @return array|null
	 */
	public static function attributes( array $settings ) {
		$type = isset( $settings['type'] ) ? (string) $settings['type'] : 'button';

		if ( ! in_array( $type, self::TYPES, true ) ) {
			return null;
		}

		$link = self::parse_link( isset( $settings['link'] ) ? $settings['link'] : '' );

		if ( null === $link ) {
			return null;
		}

		$attributes = array( 'data-ttf-embed' => $type );

		if ( 'listing' === $type ) {
			// The event list needs the brand page link.
			if ( 'brand' !== $link['kind'] ) {
				return null;
			}
			$attributes['data-brand'] = $link['slug'];
		} else {
			// A brand page link plus an event chosen from the brand's list.
			$event = 'event' === $link['kind'] ? $link['slug'] : ( isset( $settings['event'] ) ? (string) $settings['event'] : '' );

			if ( '' === $event || ! preg_match( self::SLUG_PATTERN, $event ) ) {
				return null;
			}
			$attributes['data-event'] = $event;
		}

		$label = isset( $settings['label'] ) ? trim( (string) $settings['label'] ) : '';

		if ( 'button' === $type && '' !== $label ) {
			$attributes['data-label'] = $label;
		}

		$key = isset( $settings['key'] ) ? strtolower( trim( (string) $settings['key'] ) ) : '';

		if ( preg_match( self::WIDGET_KEY_PATTERN, $key ) ) {
			$attributes['data-widget-key'] = $key;
		}

		return $attributes;
	}

	/**
	 * The placeholder HTML. Loads the embed loader on this page when there is
	 * something to show.
	 *
	 * @param array $settings See attributes().
	 * @return string
	 */
	public static function render( array $settings ) {
		$attributes = self::attributes( $settings );

		if ( null === $attributes ) {
			// Visitors see nothing. Editors see why, so a broken link is easy to find.
			if ( current_user_can( 'edit_posts' ) ) {
				return '<p class="ticket-fairy-embed-notice">'
					. esc_html__( 'Ticket Fairy: enter a Ticket Fairy event page link or brand page link here to show tickets. Only editors see this message.', 'ticket-fairy-events' )
					. '</p>';
			}

			return '';
		}

		self::enqueue_loader();

		$html = '<div';

		foreach ( $attributes as $name => $value ) {
			$html .= ' ' . $name . '="' . esc_attr( $value ) . '"';
		}

		return $html . '></div>';
	}

	public static function enqueue_loader() {
		// No version: the loader URL must stay exactly as published, because
		// the loader reads its own address to find the Ticket Fairy site.
		wp_enqueue_script( self::LOADER_HANDLE, self::LOADER_URL, array(), null, true ); // phpcs:ignore WordPress.WP.EnqueuedResourceParameters.MissingVersion
	}

	/**
	 * Adds `async` to the loader tag. WordPress 6.3 and later can do this
	 * with a loading strategy; this filter keeps older versions supported.
	 *
	 * @param string $tag    Script tag.
	 * @param string $handle Script handle.
	 * @return string
	 */
	public static function add_async_attribute( $tag, $handle ) {
		if ( self::LOADER_HANDLE !== $handle || false !== strpos( $tag, ' async' ) ) {
			return $tag;
		}

		return str_replace( ' src=', ' async src=', $tag );
	}
}
