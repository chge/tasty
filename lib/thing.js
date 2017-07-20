'use strict';

const util = require('./util'),
	instance = util.instance,
	rename = util.rename;

/**
 * Reference to client-side object in test.
 * @see {@link #thing|thing}
 */
class Thing {
	constructor(type, value) {
		/**
		 * @member {string} type Thing type.
		 * @memberof Thing.prototype
		 * @readonly
		 */
		this.type = type;
		/**
		 * @member {*} value Thing value.
		 * @memberof Thing.prototype
		 * @readonly
		 */
		this.value = value;
	}

	toJSON() {
		let type = (this.type + '') || 'unknown',
			value = this.value;

		if (instance(value, RegExp)) {
			// NOTE respect the elders.
			const flags = 'flags' in value ?
				value.flags :
				[
					value.global ? 'g' : '',
					value.ignoreCase ? 'i' : '',
					value.multiline ? 'm' : '',
					value.unicode ? 'u' : '',
					value.sticky ? 'y' : ''
				].join('');

			value = flags ?
				[value.source, flags] :
				[value.source];
		}

		return {
			t: type,
			v: value
		};
	}
}

module.exports = {
	/**
	 * References any value as {@link #Thing|Thing}.
	 * @global
	 * @member {Thing} any
	 * @see {@link #is|is}, {@link #no|no}
	 * @thing
	 * @example
is(any, nodes('.message'));
no(any, nodes('.error'));
	 */
	any: thing('any', undefined),
	/**
	 * References style sheet as {@link #Thing|Thing}.
	 * @global
	 * @function css
	 * @param {string|RegExp} url URL.
	 * @returns {Thing}
	 * @throws {TypeError}
	 * @see {@link #is|is}, {@link #no|no}
	 * @thing
	 */
	css: simple('css'),
	/**
	 * References DOCTYPE as {@link #Thing|Thing}.
	 * @global
	 * @function doctype
	 * @param {string|RegExp} value Value.
	 * @returns {Thing}
	 * @throws {TypeError}
	 * @see {@link #is|is}, {@link #no|no}
	 * @thing
	 */
	doctype: simple('doctype'),
	/**
	 * References emptiness as {@link #Thing|Thing}.
	 * @global
	 * @member {Thing} empty
	 * @see {@link #is|is}, {@link #no|no}
	 * @thing
	 */
	empty: thing('empty', undefined),
	/**
	 * References font as {@link #Thing|Thing}.
	 * @global
	 * @function font
	 * @param {string|RegExp} url
	 * @returns {Thing}
	 * @throws {TypeError}
	 * @see {@link #is|is}, {@link #no|no}
	 * @thing
	 */
	favicon: simple('favicon'),
	/**
	 * References font as {@link #Thing|Thing}.
	 * @global
	 * @function font
	 * @param {string|RegExp} url
	 * @returns {Thing}
	 * @throws {TypeError}
	 * @see {@link #is|is}, {@link #no|no}
	 * @thing
	 */
	font: simple('font'),
	/**
	 * References image (including background) as {@link #Thing|Thing}.
	 * @global
	 * @function image
	 * @param {string|RegExp} url
	 * @returns {Thing}
	 * @throws {TypeError}
	 * @see {@link #is|is}, {@link #no|no}
	 * @thing
	 */
	image: simple('image'),
	/**
	 * References location as {@link #Thing|Thing}.
	 * @global
	 * @function location
	 * @param {string|RegExp} url
	 * @returns {Thing}
	 * @throws {TypeError}
	 * @see {@link #is|is}, {@link #no|no}
	 * @thing
	 */
	location: simple('location'),
	/**
	 * References {@link https://www.w3.org/TR/html5/browsers.html#offline|app cache} or {@link https://www.w3.org/TR/appmanifest/|web app} manifest as {@link #Thing|Thing}.
	 * @global
	 * @function manifest
	 * @param {string|RegExp} url
	 * @returns {Thing}
	 * @throws {TypeError}
	 * @see {@link #is|is}, {@link #no|no}
	 * @thing
	 */
	manifest: simple('manifest'),
	node: node,
	nodes: nodes,
	/**
	 * References script as {@link #Thing|Thing}.
	 * @global
	 * @function script
	 * @param {string|RegExp} url URL.
	 * @returns {Thing}
	 * @throws {TypeError}
	 * @see {@link #is|is}, {@link #no|no}
	 * @thing
	 */
	script: simple('script'),
	/**
	 * References plain text as {@link #Thing|Thing}.
	 * @global
	 * @function text
	 * @param {string|RegExp|Number} value
	 * @returns {Thing}
	 * @throws {TypeError}
	 * @see {@link #is|is}, {@link #no|no}
	 * @thing
	 */
	text: simple('text'),
	thing: thing,
	Thing: Thing,
	title: simple('title'),
	window: window
};

function simple(type) {
	return rename(
		(value) => {
			if (typeof value !== 'string' && typeof value !== 'number' && !instance(value, RegExp)) {
				throw new TypeError(`${type}, string, number or regexp required`);
			}

			return thing(type, value);
		},
		type
	);
}

/**
 * References single DOM Node/Element as {@link #Thing|Thing}.
 * @param {string} selector
 * @returns {Thing}
 * @throws {TypeError}
 * @see {@link #is|is}, {@link #no|no}
 * @thing
 * @example
is(text('Other'), node('select.gender'));
no(text('Prove you are a human'), node('form'));
 */
function node(selector) {
	if (instance(selector, RegExp)) {
		throw TypeError('node, regexp is not supported');
	}

	return thing('node', selector);
}

/**
 * References set of DOM Nodes/Elements as {@link #Thing|Thing}.
 * @param {string} selector
 * @returns {Thing}
 * @throws {TypeError}
 * @see {@link #is|is}, {@link #no|no}
 * @thing
 * @example
is(text('Share'), nodes('.action'));
no(text('&nbsp;'), nodes('p'));
 */
function nodes(selector) {
	if (instance(selector, RegExp)) {
		throw TypeError('nodes, regexp is not supported');
	}

	return thing('nodes', selector);
}

/**
 * References given `value` as {@link #Thing|Thing} of given `type`.
 * @param {string} type Thing {@link #Thing#type|type}.
 * @param {*} value Thing {@link #Thing#value|value}.
 * @returns {Thing}
 * @throws {TypeError}
 * @see {@link #is|is}, {@link #no|no}, {@link #Thing|Thing}
 * @thing
 */
function thing(type, value) {
	if (arguments.length < 2) {
		if (instance(type, Thing)) {
			return type;
		}

		value = type;
		type = typeof value === 'string' || typeof value === 'number' || instance(value, RegExp) ?
			'text' :
			'unknown';
	}

	return instance(value, Promise) ?
		value.then(
			thing.bind(null, type)
		) :
		new Thing(type, value);
}

/**
 * Converts given `arg` to {@link #Thing|Thing}.
 * @function thing
 * @param {*|Thing} arg
 * @returns {boolean}
 */

/**
 * References window as {@link #Thing|Thing}.
 * @param {string} [name] Child window name.
 * @returns {Thing}
 * @throws {TypeError}
 * @see {@link #is|is}, {@link #no|no}
 * @thing
 * @example
is(image('kitty.png'), window);
no(image('unicorn.png'), window());
is(image('book.png'), window('reference'));
no(text('404'), window('download'));
 */
function window(name) {
	if (instance(name, RegExp)) {
		throw TypeError('window, regexp is not supported');
	}

	return thing('window', name);
}

window.__proto__ = thing('window', undefined);
