'use strict';

import * as polyfill from 'tasty-treewalker';

import { escape, filter, find as findItem, reason } from './util';

export function click(node, force) {
	hover(node);

	const cause = disabled(node);
	if (cause) {
		throw reason('node', cause, 'is disabled');
	}

	trigger(node, 'MouseEvent', 'mousedown', null, force);
	focus(node);
	trigger(node, 'MouseEvent', 'mouseup', null, force);

	const parent = node.parentNode;
	if (node.click) {
		node.click();
	} else if (parent && parent.click) {
		parent.click();
	} else {
		trigger(node, 'MouseEvent', 'click', null, force);
	}

	return node;
}

/**
 * @license CC BY-SA 3.0 https://stackoverflow.com/a/5350888
 */
export function commonAncestor(node1, node2) {
	const parents = function parents(node) {
			const nodes = [node];
			for (; node; node = node.parentNode) {
				nodes.unshift(node);
			}

			return nodes;
		},
		parents1 = parents(node1),
		parents2 = parents(node2);

	if (parents1[0] === parents2[0]) {
		for (let i = 0; i < parents1.length; i++) {
			if (parents1[i] != parents2[i]) {
				return parents1[i - 1];
			}
		}
	}

	return null;
}

export function dblclick(node, force) {
	hover(node);

	const cause = disabled(node);
	if (cause) {
		throw reason('node', cause, 'is disabled');
	}

	trigger(node, 'MouseEvent', 'mousedown', null, force);
	focus(node);
	trigger(node, 'MouseEvent', 'mouseup', null, force);
	trigger(node, 'MouseEvent', 'mousedown', null, force);
	trigger(node, 'MouseEvent', 'mouseup', null, force);
	trigger(node, 'MouseEvent', 'dblclick', null, force);

	return node;
}

export function element(node) {
	return node && node.nodeType === 3 ?
		node.parentNode :
		node;
}

export function find(what, where, options) {
	const method = find[what.type];
	if (method) {
		return method(what, where, options);
	} else {
		throw reason(what.type, 'is not supported');
	}
}

find.any = find.empty = find.image = find.text = (what, where, options) => {
	const value = what.value,
		regexp = what.type === 'any' ?
			/.*/ :
			what.type === 'empty' ?
				/^\s*$/ :
				value instanceof RegExp ?
					value :
					options.strict ?
						new RegExp('^' + escape(value, true) + '$') :
						new RegExp(escape(value, true)),
		match = what.type === 'image' ?
			matchImage :
			matchText;
	let list;
	switch (where.type) {
		case 'node':
		case 'nodes':
			list = findNodesBySelector(where.value, document.documentElement);
			break;
		case 'unknown':
		case 'window':
			list = findNodesByMatchInContext(
				regexp,
				match,
				where.value ?
					findWindowByName(where.value).document.body :
					document.body,
				options.strict
			);
			break;
		default:
			throw reason('cannot search', what, 'in', where);
	}

	return findNodesByMatchInList(regexp, match, list, options.strict);
};

find.font = (what) => {
	// TODO window.getComputedStyle(selector).fontFamily;
	throw reason(what.type, 'is not implemented yet, sorry');
};

find.node = find.nodes = (what, where, options) => {
	switch (where.type) {
		case 'node': {
			const found = find(where, {type: 'window'}, options);
			if (!found) {
				throw reason('no', where, 'to find', what, 'in');
			}

			return findNodesBySelector(what.value, found);
		}
		case 'window':
			return findNodesBySelector(what.value, document.documentElement);
		default:
			throw reason('cannot search', what, 'in', where);
	}
};

function findNodesBySelector(selector, context) {
	return nodeListToArray(
		context.querySelectorAll(selector)
	);
}

function findNodesByMatchInContext(regexp, match, context, strict) {
	const NodeFilter = window.NodeFilter ||
			polyfill.NodeFilter,
		filter = (node) => node.innerText || node.textContent || node.nodeValue ||
			node.value || node.placeholder || node.href || node.src ?
				NodeFilter.FILTER_ACCEPT :
				NodeFilter.FILTER_REJECT,
		what = NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT;

	filter.acceptNode = filter;
	const walker = document.createTreeWalker ?
			document.createTreeWalker(context, what, filter, false) :
			polyfill.createTreeWalker(context, what, filter),
		nodes = [];

	let node = walker.nextNode();
	while (node) {
		match(regexp, node, strict) &&
			nodes.push(node);
		node = walker.nextNode();
	}

	return nodes;
}

function findNodesByMatchInList(regexp, match, list, strict) {
	// TODO optimize by number of iterations.
	let nodes;
	if (regexp) {
		nodes = [];
		for (let i = 0; i < list.length; i++) {
			let node = list[i];
			match(regexp, node, strict) &&
				nodes.push(node);
		}
	} else {
		nodes = list;
	}

	const filtered = filter(
		nodes,
		(node) => visible(node, strict)
	);

	return filter(
		filtered.length ?
			filtered :
			nodes,
		(parent) => !findItem(
			list,
			(child) => matchParent(parent, child)
		)
	);
}

function findWindowByName(name) {
	const child = window.open(null, name),
		doc = child.document;

	// WORKAROUND: it's impossible to get list of child windows afterwards.
	if (doc.head && !doc.head.childElementCount || doc.body && !doc.body.childElementCount) {
		child.close();
		throw reason('no such window', name);
	}

	return child;
}

function matchImage(regexp, node, strict) {
	// TODO support pictures.
	// TODO support border images.
	// TODO support multiple backgrounds.
	return regexp.test(innerImage(node, strict)) ||
		regexp.test(beforeImage(node, strict)) ||
			regexp.test(afterImage(node, strict));
}

export function matchParent(parent, child) {
	while (child) {
		child = child.parentNode;
		if (child === parent) {
			return true;
		}
	}

	return false;
}

function matchText(regexp, node, strict) {
	const inner = innerText(node, strict);
	if (regexp.test(inner)) {
		return true;
	}
	const before = beforeText(node, strict);
	if (regexp.test(before)) {
		return true;
	}
	const after = afterText(node, strict);
	if (regexp.test(before)) {
		return true;
	}
	// TODO support img's alt attribute in error state (via naturalWidth).
	// TODO support title attribute in hovered state.
	// TODO support HTML5 Forms messages (via validationMessage).

	return regexp.test(
		filter(
			[before, inner, after],
			(text) => !!text
		).join('')
	);
}

function afterImage(node) {
	if (!node || node.nodeType === 3) {
		return null;
	}
	const style = getStyle(node, ':after');

	return getUrl(style.backgroundImage);
}

function afterText(node, strict) {
	if (!node || node.nodeType === 3) {
		return null;
	}
	const style = getStyle(node, ':after');

	return transform(
		decontent(style.content),
		style,
		strict,
		true
	);
}

function beforeImage(node) {
	if (!node || node.nodeType === 3) {
		return null;
	}
	const style = getStyle(node, ':before');

	return getUrl(style.backgroundImage);
}

function beforeText(node, strict) {
	if (!node || node.nodeType === 3) {
		return null;
	}
	const style = getStyle(node, ':before');

	return transform(
		decontent(style.content),
		style,
		strict
		// NOTE :before is never fragment.
	);
}

function innerImage(node) {
	if (!node || node.nodeType === 3) {
		return null;
	}
	if (node.src) {
		return node.src;
	}
	const style = getStyle(node);

	return getUrl(style.backgroundImage);
}

function innerText(node, strict) {
	if (!node) {
		return null;
	}
	if (node.nodeType === 3) {
		return strict ?
			node.textContent || node.nodeValue :
			trim(node.textContent || node.nodeValue || '');
	}

	// NOTE Node.textContent doesn't respect CSS text-transform, while HTMLElement.innerText does, but not always.
	// TODO optimize: return node.innerText straightforward, when it certainly respects CSS text-transform.

	const style = getStyle(node);

	return transform(
		node.innerText ?
			node.innerText :
			'value' in node ?
				node.type === 'password' ?
					getPassword(node, style) :
					node.value ||
						(document.activeElement !== node ? node.placeholder : null) ||
							node.textContent || node.nodeValue || '' :
				node.textContent || node.nodeValue || '',
		style,
		strict,
		true
	);
}

function getUrl(string) {
	string = /url\(['"]*(.*?)['"]*\)/.exec(string);

	return string ? string[1] : null;
}

function getPassword(node, style) {
	if (!node.value) {
		// TODO check placeholder support?
		return node.placeholder || '';
	}

	const length = node.value.length;
	switch (style.webkitTextSecurity) {
		case 'circle':
			return symbols('◦', length);
		case 'square':
			return symbols('■', length);
		case 'none':
			return node.value;
		case 'disc':
		default:
			return symbols('•', length);
	}
}

function getStyle(node, pseudo) {
	if (node === document || node === document.documentElement) {
		return {};
	}

	return computeStyle(
		element(node),
		pseudo || ''
	);
}

function computeStyle(node, pseudo) {
	node = element(node);

	return window.getComputedStyle ?
		window.getComputedStyle(node, pseudo) :
		pseudo ?
			{} :
			node.currentStyle;
}

function transform(text, style, strict, fragment) {
	switch (style.textTransform) {
		case 'uppercase':
			return text.toUpperCase();
		case 'lowercase':
			return text.toLowerCase();
		case 'capitalize':
			return fragment && style.display === 'inline' ?
				// TODO support non-BMP characters?
				capitalize(text).replace(/^./, text.charAt(0)) :
				capitalize(text);
	}

	return !strict && text ?
		trim(text) :
		text;
}

function decontent(content) {
	switch (true) {
		case !content:
			return '';
		case content === 'normal':
		case content === 'none':
			return '';
		case content.indexOf('"') === 0:
		case content.indexOf("'") === 0:
			return content.substring(1, content.length - 1);
		// TODO support attr, counter, *-quote, url;
	}

	return content;
}

function capitalize(text) {
	// TODO support non-BMP characters?
	return text.replace(
		/\b./g,
		(letter) => letter.toUpperCase()
	);
}

export function nodeListToArray(list) {
	// NOTE Array.prototype.slice not always works.

	const array = [];
	for (let i = 0; i < list.length; i++) {
		array.push(
			list.item(i)
		);
	}

	return array;
}

function symbols(symbol, length) {
	let string = '',
		i;
	for (i = 0; i < length | 0; i++) {
		string += symbol;
	}

	return string;
}

export function focus(node) {
	const active = document.activeElement;
	active === node ||
		blur(active);

	const parent = node.parentNode;
	if (node.focus) {
		node.focus();
	} else if (parent && parent.focus) {
		parent.focus();
	} else {
		trigger(node, 'FocusEvent', 'focus', {bubbles: false, cancellable: false});
		trigger(node, 'FocusEvent', 'focusin', {cancellable: false});
	}

	return node;
}

export function blur(node) {
	const parent = node.parentNode;
	if (node.blur) {
		node.blur();
	} else if (parent && parent.blur) {
		parent.blur();
	} else {
		// TODO change event if needed.
		trigger(node, 'FocusEvent', 'blur', {bubbles: false, cancellable: false});
		trigger(node, 'FocusEvent', 'focusout', {cancellable: false});
	}

	return node;
}

export function hover(node) {
	const hovered = hover.node;
	hovered && hovered !== node &&
		rest(hovered);

	trigger(node, 'MouseEvent', 'mouseover');
	trigger(node, 'MouseEvent', 'mouseenter');

	hover.node = node;

	return node;
}

export function rest(node) {
	trigger(node, 'MouseEvent', 'mouseleave');
	trigger(node, 'MouseEvent', 'mouseout');

	hover.node = null;

	return node;
}

export function visible(node, strict) {
	node = element(node);

	const attached = !!node.offsetParent ||
		node === document.body;
	if (!attached || !node.offsetWidth) {
		return false;
	}

	const rect = measure(node),
		width = window.innerWidth ||
			document.documentElement.clientWidth,
		height = window.innerHeight ||
			document.documentElement.clientHeight,
		viewport = strict ?
			rect.left >= 0 && rect.top >= 0 && rect.right <= width && rect.bottom <= height :
			rect.left < width && rect.top < height && rect.right > 0 && rect.bottom > 0;

	// TODO check color vs background (via https://www.w3.org/TR/AERT#color-contrast).

	// TODO more reliable.
	return viewport && !hidden(node);
}

export function hidden(node) {
	while (node) {
		if (getStyle(node).visibility === 'hidden') {
			return node;
		}
		node = node.parentNode;
	}

	return false;
}

export function disabled(node) {
	while (node) {
		if (node.disabled) {
			return node;
		}
		node = node.parentNode;
	}

	return false;
}

export function on(target, event, handler, options) {
	target.addEventListener ?
		target.addEventListener(event, handler, options || false) :
		target.attachEvent('on' + event, handler);

	return target;
}

export function reach(node) {
	const rect = measure(node),
		x = (rect.left + rect.right) / 2,
		y = (rect.top + rect.bottom) / 2,
		actual = document.elementFromPoint(x, y);
	// NOTE node could be outside of the viewport.
	if (!actual) {
		return actual;
	}

	let parent = actual;
	while (parent !== node) {
		if (!(parent = parent.parentNode)) {
			return actual;
		}
	}

	return parent;
}

function measure(node) {
	// TODO consider border-radius.
	if (node.getBoundingClientRect) {
		return node.getBoundingClientRect();
	}

	let range;
	if (document.body.createTextRange) {
		range = document.body.createTextRange();
		node.nodeType == 3 ?
			range.moveToElementText(node.parentNode) :
			range.moveToElementText(node);
	} else {
		range = document.createRange();
		range.selectNodeContents(node);
	}

	return range.getBoundingClientRect();
}

/**
 * @license CC BY-SA 3.0 http://stackoverflow.com/a/987376
 */
export function highlight(node) {
	try {
		if (document.body.createTextRange) {
			const range = document.body.createTextRange();
			node.nodeType == 3 ?
				range.moveToElementText(node.parentNode) :
				range.moveToElementText(node);
			range.select &&
				range.select();
		} else if (window.getSelection) {
			const selection = window.getSelection(),
				range = document.createRange();
			range.selectNodeContents(node);
			selection.removeAllRanges();
			selection.addRange(range);
		}
	} catch (thrown) {
		// TODO log?
	}

	return false;
}

export function trigger(node, type, arg, init, force) {
	type = type || 'Event';
	init = init || {};
	init.bubbles = init.bubbles !== false,
	init.cancellable = init.cancellable !== false;

	let event;
	if (window[type]) {
		try {
			event = new window[type](arg, init);
		} catch (thrown) {
			// TODO log?
		}
	}

	if (!event) {
		const bubbles = init.bubbles,
			cancellable = init.cancellable;
		switch (type) {
			case 'MouseEvent': {
				event = createEvent('MouseEvents');
				// TODO pass other values from init object.
				const detail = arg === 'click' ? 1 : arg === 'dblclick' ? 2 : 0;
				if (event.initMouseEvent) {
					event.initMouseEvent(arg, bubbles, cancellable, window, detail, 0, 0, 0, 0, false, false, false, false, 0, null);
				} else if (event.initEvent) {
					event.initEvent(arg, bubbles, cancellable, window, detail);
				}
				break;
			}
			default:
				event = createEvent('HTMLEvents');
				// TODO pass other values from init object.
				event.initEvent &&
					event.initEvent(arg, bubbles, cancellable, window);
		}
	}

	// WORKAROUND: text Node could be already detached.
	let parent;
	try {
		parent = node.parentNode;
	} catch (thrown) {
		parent = null;
	}

	const triggered = node.dispatchEvent ?
		node.dispatchEvent(event) :
		node.fireEvent ?
			node.fireEvent('on' + arg, event) :
			parent &&
				parent.fireEvent('on' + arg, event);

	if (triggered && force && node.href) {
		window.location = node.href;
	}

	return event;
}

function createEvent(type) {
	return document.createEvent ?
		document.createEvent(type) :
		document.createEventObject(type);
}

/**
 * @license Copyright Steven Levithan {@link http://blog.stevenlevithan.com/archives/faster-trim-javascript}
 */
function trim(str) {
	str = str.replace(/^\s\s*/, '');
	let ws = /\s/,
		i = str.length;

	while (ws.test(str.charAt(--i)));

	return str.slice(0, i + 1);
}
