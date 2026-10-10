<?php
/**
 * Checks the PHP side of the embed contract without a WordPress install.
 * Run: php tests/run.php
 *
 * The cases match packages/core/src/core.test.ts, so the PHP block and
 * shortcode and the JavaScript plugins read links the same way.
 */

define( 'ABSPATH', __DIR__ );

$enqueued = array();

function wp_parse_url( $url ) {
	return parse_url( $url );
}
function esc_attr( $text ) {
	return htmlspecialchars( (string) $text, ENT_QUOTES, 'UTF-8' );
}
function esc_html__( $text ) {
	return htmlspecialchars( $text, ENT_QUOTES, 'UTF-8' );
}
function current_user_can() {
	return $GLOBALS['is_editor'];
}
function wp_enqueue_script( $handle ) {
	$GLOBALS['enqueued'][] = $handle;
}

require dirname( __DIR__ ) . '/ticket-fairy-events/includes/class-embed.php';

use TicketFairy\Events\Embed;

$failures = 0;
$checks   = 0;

function check( $label, $expected, $actual ) {
	global $failures, $checks;
	++$checks;
	if ( $expected !== $actual ) {
		++$failures;
		echo "FAIL: $label\n  expected: " . var_export( $expected, true ) . "\n  actual:   " . var_export( $actual, true ) . "\n";
	}
}

$event = array(
	'kind' => 'event',
	'slug' => 'anyma-tulum-2027',
);

foreach ( array(
	'https://www.ticketfairy.com/event/anyma-tulum-2027',
	'http://ticketfairy.com/event/anyma-tulum-2027/',
	'www.ticketfairy.com/event/anyma-tulum-2027?r=abc#tickets',
	'ticketfairy.com/event/anyma-tulum-2027',
	'  https://www.theticketfairy.com/event/anyma-tulum-2027  ',
) as $link ) {
	check( "event link $link", $event, Embed::parse_link( $link ) );
}

check(
	'brand link',
	array(
		'kind' => 'brand',
		'slug' => 'zamna-festival',
	),
	Embed::parse_link( 'https://www.ticketfairy.com/events/zamna-festival' )
);

foreach ( array(
	'',
	'https://example.com/event/anyma',
	'https://ticketfairy.com.evil.example/event/anyma',
	'https://www.ticketfairy.com/',
	'https://www.ticketfairy.com/event/',
	'https://www.ticketfairy.com/event/a/b',
	'https://www.ticketfairy.com/pass/summer',
	'https://www.ticketfairy.com/event/<script>',
	'javascript://www.ticketfairy.com/event/anyma',
	'ftp://www.ticketfairy.com/event/anyma',
) as $link ) {
	check( "rejects $link", null, Embed::parse_link( $link ) );
}

check(
	'button with label',
	array(
		'data-ttf-embed' => 'button',
		'data-event'     => 'party',
		'data-label'     => 'Get tickets',
	),
	Embed::attributes(
		array(
			'type'  => 'button',
			'link'  => 'ticketfairy.com/event/party',
			'label' => ' Get tickets ',
		)
	)
);

check(
	'event list uses the brand',
	array(
		'data-ttf-embed' => 'listing',
		'data-brand'     => 'zamna',
	),
	Embed::attributes(
		array(
			'type' => 'listing',
			'link' => 'ticketfairy.com/events/zamna',
		)
	)
);

check( 'event list needs a brand link', null, Embed::attributes( array( 'type' => 'listing', 'link' => 'ticketfairy.com/event/party' ) ) );
check( 'brand link needs a chosen event', null, Embed::attributes( array( 'type' => 'checkout', 'link' => 'ticketfairy.com/events/zamna' ) ) );
check(
	'brand link with a chosen event',
	array(
		'data-ttf-embed' => 'checkout',
		'data-event'     => 'renaissance',
	),
	Embed::attributes(
		array(
			'type'  => 'checkout',
			'link'  => 'ticketfairy.com/events/zamna',
			'event' => 'renaissance',
		)
	)
);
check( 'unknown type', null, Embed::attributes( array( 'type' => 'map', 'link' => 'ticketfairy.com/event/party' ) ) );
check(
	'keeps only a well-formed embed key',
	'a' . str_repeat( 'b', 63 ),
	Embed::attributes(
		array(
			'type' => 'lineup',
			'link' => 'ticketfairy.com/event/party',
			'key'  => 'A' . str_repeat( 'B', 63 ),
		)
	)['data-widget-key']
);

$GLOBALS['is_editor'] = false;
check( 'visitors see nothing for a broken block', '', Embed::render( array( 'type' => 'button', 'link' => 'nope' ) ) );
check( 'nothing broken loads no script', array(), $GLOBALS['enqueued'] );

$GLOBALS['is_editor'] = true;
check( 'editors see why', true, false !== strpos( Embed::render( array( 'type' => 'button', 'link' => 'nope' ) ), 'ticket-fairy-embed-notice' ) );

check(
	'renders an escaped placeholder and loads the loader',
	'<div data-ttf-embed="button" data-event="party" data-label="&quot;&gt;&lt;img src=x&gt;"></div>',
	Embed::render(
		array(
			'type'  => 'button',
			'link'  => 'ticketfairy.com/event/party',
			'label' => '"><img src=x>',
		)
	)
);
check( 'loader enqueued', array( Embed::LOADER_HANDLE ), $GLOBALS['enqueued'] );

check(
	'adds async to the loader tag only',
	"<script async src='https://www.ticketfairy.com/resources/js/event-embed.js'></script>",
	Embed::add_async_attribute( "<script src='https://www.ticketfairy.com/resources/js/event-embed.js'></script>", Embed::LOADER_HANDLE )
);
check( 'other scripts untouched', "<script src='x.js'></script>", Embed::add_async_attribute( "<script src='x.js'></script>", 'other' ) );

echo "$checks checks, $failures failed\n";
exit( $failures > 0 ? 1 : 0 );
