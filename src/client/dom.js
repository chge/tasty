'use strict';

module.exports = {
	blur: blur,
	click: click,
	find: find,
	focus: focus,
	is: is,
	reach: reach,
	trigger: trigger
};

const util = require('./util');

const random = util.random;

function blur(node) {
	if (node.blur) {
		node.blur();
	} else {
		// TODO change event if needed.
		trigger(node, 'FocusEvent', 'blur', false, false);
		trigger(node, 'FocusEvent', 'focusout', true, false);
	}
}

function click(node) {
	focus(node);
	trigger(node, 'MouseEvent', 'click');
}

function find(regexp, selector) {
	// TODO selector: query nodes, walk through them.
	const walker = document.createTreeWalker(
			document.body,
			NodeFilter.SHOW_TEXT,
			null,
			false
		),
		precursor = new RegExp(regexp.source, 'i'),
		found,
		node;

	while (node = walker.nextNode()) {
		if (precursor.test(node.textContent) &&
			regexp.test(innerText(node.parentNode))
		) {
			found = node;
			break;
		}
	}

	return found;
}

function innerText(node) {
	if (!node) {
		return null;
	}
	if (node.innerText) {
		return node.innerText;
	}

	// NOTE Node.textContent doesn't respect CSS text-transform, while HTMLElement.innerText does.
	const style = window.getComputedStyle(node);
	switch (style.textTransform) {
		case 'uppercase':
			return node.textContent.toUpperCase();
		case 'lowercase':
			return node.textContent.toLowerCase();
		case 'capitalize':
			return node.textContent.replace(
				/\b./g,
				(letter) => letter.toUpperCase()
			);
	}

	return node.textContent;
}

function focus(node) {
	if (node.focus) {
		node.focus();
	} else {
		const active = document.activeElement;
		if (active !== node) {
			blur(active);
		}
		trigger(node, 'FocusEvent', 'focus', false, false);
		trigger(node, 'FocusEvent', 'focusin', true, false);
	}
}

function is(node, partially) {
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

function reach(node) {
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

function trigger(node, type, arg, bubbles, cancellable) {
	const event = document.createEvent(type || 'Event');
	event.initEvent(arg, bubbles !== false, cancellable !== false);
	node.dispatchEvent(event);

	return event;
}
