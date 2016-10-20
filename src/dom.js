'use strict';

import * as polyfill from 'tasty-treewalker';

import { random } from './util';

export function blur(node) {
	if (node.blur) {
		node.blur();
	} else {
		// TODO change event if needed.
		trigger(node, 'FocusEvent', 'blur', false, false);
		trigger(node, 'FocusEvent', 'focusout', true, false);
	}
}

export function click(node) {
	focus(node);
	trigger(node, 'MouseEvent', 'click');
}

export function find(regexp, selector) {
	const list = selector ?
		findAllBySelector(selector) :
		[];

	return regexp ?
		selector ?
			findByTextInList(regexp, list) :
			findByTextInBody(regexp) :
		list[0];
}

function findAllBySelector(selector) {
	// TODO Sizzle.
	return document.querySelectorAll(selector);
}

function findBySelector(selector) {
	// TODO Sizzle.
	return document.querySelector(selector);
}

function findByTextInList(regexp, list) {
	// TODO util.find();
	let i, found, node;
	for (i = 0; i < list.length; i++) {
		node = list[i];
		if (matchText(regexp, node)) {
			found = node;
			break;
		}
	}

	return found;
}

function findByTextInBody(regexp) {
	const body = document.body,
		NodeFilter = window.NodeFilter ||
			polyfill.NodeFilter,
		filter = (node) => node.innerText || node.textContent || node.nodeValue ||
			node.value || node.placeholder ?
				NodeFilter.FILTER_ACCEPT :
				NodeFilter.FILTER_REJECT,
		what = NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT;

	filter.acceptNode = filter;
	const walker = document.createTreeWalker ?
		document.createTreeWalker(body, what, filter, false) :
		polyfill.createTreeWalker(body, what, filter);

	let found, node;
	while (node = walker.nextNode()) {
		if (matchText(regexp, node)) {
			found = node;
			break;
		}
	}

	return found;
}

export function hover(node) {
	trigger(node, 'MouseEvent', 'mouseover');
	trigger(node, 'MouseEvent', 'mouseenter');
}

function matchText(regexp, node) {
	return 'value' in node ?
		regexp.test(
			innerText(node)
		) :
		new RegExp(regexp.source, 'i').test(
			node.textContent || node.nodeValue
		) &&
			regexp.test(
				innerText(node.parentNode)
			);
}

function innerText(node) {
	if (!node) {
		return null;
	}
	if (node.innerText) {
		return node.innerText;
	}

	// NOTE Node.textContent doesn't respect CSS text-transform, while HTMLElement.innerText does.
	const style = window.getComputedStyle ?
			window.getComputedStyle(node) :
			node.currentStyle,
		text = 'value' in node ?
			node.type === 'password' ?
				node.placeholder :
				node.value || node.placeholder || node.textContent || node.nodeValue :
			node.textContent || node.nodeValue;
	switch (style.textTransform) {
		case 'uppercase':
			return text.toUpperCase();
		case 'lowercase':
			return text.toLowerCase();
		case 'capitalize':
			return text.replace(
				/\b./g,
				(letter) => letter.toUpperCase()
			);
	}

	return text;
}

export function focus(node) {
	const active = document.activeElement;
	if (active !== node) {
		blur(active);
	}

	if (node.focus) {
		node.focus();
	} else {
		trigger(node, 'FocusEvent', 'focus', false, false);
		trigger(node, 'FocusEvent', 'focusin', true, false);
	}
}

export function is(node, partially) {
	const rect = node.getBoundingClientRect(),
		width = window.innerWidth ||
			document.documentElement.clientWidth,
		height = window.innerHeight ||
			document.documentElement.clientHeight,
		viewport = partially ?
			rect.left < width && rect.top < height && rect.right > 0 && rect.bottom > 0 :
			rect.left >= 0 && rect.top >= 0 && rect.right <= width && rect.bottom <= height;

	// TODO more reliable.
	return viewport &&
		(!!node.offsetParent || node === document.body);
}

export function on(node, event, handler, capture) {
	node.addEventListener ?
		node.addEventListener(event, handler, capture === true) :
		node.attachEvent('on' + event, handler);
}

export function reach(node) {
	// TODO randomize coordinates within bounding rect.
	// NOTE shdows increase bounding rect and make click to miss the node.

	let rect = node.getBoundingClientRect(),
		x = (rect.left + rect.right) / 2,
		y = (rect.top + rect.bottom) / 2,
		actual = document.elementFromPoint(x, y),
		parent = actual;

	while (parent !== node) {
		if (!(parent = parent.parentNode)) {
			return [actual, x, y];
		}
	}

	return [parent, x, y];
}

export function trigger(node, type, arg, bubbles, cancellable) {
	type = type || 'Event';
	const event = document.createEvent ?
		document.createEvent(type) :
		document.createEventObject(type);
	if (event.initEvent) {
		event.initEvent(arg, bubbles !== false, cancellable !== false);
		node.dispatchEvent(event);
	} else {
		node.fireEvent('on' + arg, event);
	}

	return event;
}
