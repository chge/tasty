import { highlight, trigger } from '../dom';
import { reason } from '../utils';

export default function paste(text) {
	const node = document.activeElement ||
		document.querySelector(':focus');
	if (!node) {
		throw reason('no active node to paste into');
	}
	if (!('value' in node)) {
		throw reason('cannot paste into active node', node);
	}
	if (node.disabled) {
		throw reason('cannot paste into disabled node', node);
	}
	if (node.readOnly) {
		throw reason('cannot paste into read-only node', node);
	}
	this.logger.debug('paste', node);
	highlight(node);

	const value = node.value,
		start = node.selectionStart || value.length,
		end = node.selectionEnd || value.length;
	try {
		delete node.value;
	} catch (thrown) {
		// NOTE noop
	}
	node.value = value.substr(0, start) +
		text +
		value.substr(end, value.length);

	trigger(node, 'ClipboardEvent', 'paste');
	'oninput' in window ?
		trigger(node, 'Event', 'input', {cancellable: false}) :
		trigger(node, 'Event', 'change', {cancellable: false});
}
