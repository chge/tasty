'use strict';

import * as polyfill from 'tasty-treewalker';

import { escape, filter, find as findItem, random, reason } from './util';

export function click(node, force) {
	hover(node);
	focus(node);

	if (node.disabled) {
		throw reason('node', node, 'is disabled');
	}
	const parent = node.parentNode;
	if (parent && parent.disabled) {
		throw reason('node', parent, 'is disabled');
	}
	if (node.click) {
		node.click();
	} else if (parent && parent.click) {
		parent.click();
	} else {
		trigger(node, 'MouseEvent', 'mousedown', null, force);
		trigger(node, 'MouseEvent', 'mouseup', null, force);
		trigger(node, 'MouseEvent', 'click', null, force);
	}

	return node;
}

export function dblclick(node, force) {
	hover(node);
	focus(node);

	if (node.disabled) {
		throw reason('node', node, 'is disabled');
	}
	const parent = node.parentNode;
	if (parent && parent.disabled) {
		throw reason('node', parent, 'is disabled');
	}
	trigger(node, 'MouseEvent', 'mousedown', null, force);
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
	switch (what.type) {
		case 'any':
			return findByText(/.*/, where, options);
		case 'empty':
			return findByText(/^\s*$/, where, options);
		case 'font':
			// TODO window.getComputedStyle(selector).fontFamily;
			throw reason(what.type, 'is not implemented yet, sorry');
		case 'image':
			// TODO return findByImage(what.value, where, options);
			throw reason(what.type, 'is not implemented yet, sorry');
		case 'node':
		case 'nodes':
			if (where.type) {
				throw reason('cannot search node(s) in', where.type);
			}
			return findBySelector(what.value, document.documentElement);
		case 'text': {
			const value = what.value,
				regexp = value instanceof RegExp ?
					value :
					new RegExp(escape(value, true));

			return findByText(regexp, where, options);
		}
		default:
			throw reason(what.type, 'is not supported');
	}
}

function findByText(regexp, where, options) {
	let list;
	switch (where.type) {
		case 'node':
			list = findBySelector(where.value, document.documentElement);
			break;
		case 'nodes':
			list = findAllBySelector(where.value, document.documentElement);
			break;
		case 'unknown':
		case 'window':
			list = findAllByText(
				regexp,
				where.value ?
					findWindowByName(where.value).document.body :
					document.body,
				options.strict
			);
			break;
		default:
			throw reason('find, scope', where.type, 'is not supported');
	}

	return findByTextInList(regexp, list, options.strict);
}

function findBySelector(selector, context) {
	return context.querySelector(selector);
}

function findAllBySelector(selector, context) {
	return nodeListToArray(
		context.querySelectorAll(selector)
	);
}

function findByTextInList(regexp, list, strict) {
	// TODO optimize by number of iterations.
	let nodes;
	if (regexp) {
		nodes = [];
		for (let i = 0; i < list.length; i++) {
			let node = list[i];
			matchText(regexp, node, strict) &&
				nodes.push(node);
		}
	} else {
		nodes = list;
	}

	const filtered = filter(
		nodes,
		(node) => visible(node, strict)
	);

	return findByDepthInList(
		filtered.length ?
			filtered :
			nodes
	);
}

function findAllByText(regexp, context, strict) {
	const NodeFilter = window.NodeFilter ||
			polyfill.NodeFilter,
		filter = (node) => node.innerText || node.textContent || node.nodeValue || node.value || node.placeholder ?
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
		matchText(regexp, node, strict) &&
			nodes.push(node);
		node = walker.nextNode();
	}

	return nodes;
}

function findByDepthInList(list) {
	if (list.length < 2) {
		return list[0];
	}

	const deep = filter(
		list,
		(parent) => !findItem(
			list,
			(child) => matchParent(parent, child)
		)
	);

	return deep[0];
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

function matchParent(parent, child) {
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

function afterText(node, strict) {
	if (!node) {
		return null;
	}
	if (node.nodeType === 3) {
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

function beforeText(node, strict) {
	if (!node) {
		return null;
	}
	if (node.nodeType === 3) {
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
					node.value || node.placeholder || node.textContent || node.nodeValue :
				node.textContent || node.nodeValue,
		style,
		strict,
		true
	);
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
	node = element(node);
	pseudo = pseudo || '';

	const key = pseudo ?
		'style' + pseudo :
		'style';

	return getData(node, key) ||
		setData(node, key, computeStyle(node, pseudo));
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

function getData(node, name) {
	node = element(node);

	return node && node.__tasty ?
		node.__tasty[name] :
		undefined;
}

export function nodeListToArray(list) {
	// NOTE [].slice not always works.

	const array = [];
	for (let i = 0; i < list.length; i++) {
		array.push(
			list.item(i)
		);
	}

	return array;
}

function setData(node, name, value) {
	node = element(node);

	if (!node) {
		return;
	}
	if (!node.__tasty) {
		node.__tasty = {};
	}
	node.__tasty[name] = value;

	return value;
}

// eslint-disable-next-line no-unused-vars
function removeData(node) {
	node = element(node);

	if (node) {
		delete node.__tasty;
	}

	return node;
}

function symbols(symbol, length) {
	let string = '',
		i;
	for (i = 0; i < length | 0; i++) {
		string += symbol;
	}

	return string;
}

export function enabled(node) {
	while (node) {
		if (node.disabled) {
			return false;
		}
		if (node === document.body) {
			return true;
		}
		node = node.parentNode;
	}

	return !!node;
}

export function focus(node) {
	const active = document.activeElement;
	active === node ||
		blur(active);

	if (node.focus) {
		node.focus();
	} else {
		trigger(node, 'FocusEvent', 'focus', {bubbles: false, cancellable: false});
		trigger(node, 'FocusEvent', 'focusin', {cancellable: false});
	}

	return node;
}

export function blur(node) {
	if (node.blur) {
		node.blur();
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

	const rect = node.getBoundingClientRect(),
		width = window.innerWidth ||
			document.documentElement.clientWidth,
		height = window.innerHeight ||
			document.documentElement.clientHeight,
		viewport = strict ?
			rect.left >= 0 && rect.top >= 0 && rect.right <= width && rect.bottom <= height :
			rect.left < width && rect.top < height && rect.right > 0 && rect.bottom > 0,
		style = strict ?
			getStyle(node) :
			null,
		hidden = style ?
			style.visibility === 'hidden' :
			false;

	// TODO check color vs background (via https://www.w3.org/TR/AERT#color-contrast).

	// TODO more reliable.
	return viewport && !hidden;
}

export function on(target, event, handler, options) {
	target.addEventListener ?
		target.addEventListener(event, handler, options || false) :
		target.attachEvent('on' + event, handler);

	return target;
}

export function reach(node) {
	node = element(node);

	// TODO consider border-radius.

	let rect = node.getBoundingClientRect(),
		x = random(rect.left, rect.right),
		y = random(rect.top, rect.bottom),
		actual = document.elementFromPoint(x, y),
		parent = actual;

	while (parent !== node) {
		if (!(parent = parent.parentNode)) {
			return [actual, x, y];
		}
	}

	return [parent, x, y];
}

/**
 * @license CC BY-SA 3.0 http://stackoverflow.com/a/987376
 */
export function highlight(node) {
	try {
		if (document.body.createTextRange) {
			const range = document.body.createTextRange();
			range.moveToElementText(node);
			if (range.execCommand) {
				return range.execCommand('hiliteColor', false, '#ff4f00');
			} else {
				range.select();

				return document.execCommand('hiliteColor', false, '#ff4f00');
			}
		} else if (window.getSelection) {
			const selection = window.getSelection(),
				range = document.createRange();
			range.selectNodeContents(node);
			selection.removeAllRanges();
			selection.addRange(range);

			return document.execCommand('hiliteColor', false, '#ff4f00');
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

	// WORKAROUND: text node could be already detached.
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
