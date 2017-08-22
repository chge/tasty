import { highlight, trigger } from '../dom';
import { reason } from '../utils';

export default function paste(text) {
	const target = document.activeElement;
	if (!target) {
		throw reason('no active node to paste into');
	}
	if (!('value' in target)) {
		throw reason('cannot paste into active node', target);
	}
	if (target.disabled) {
		throw reason('cannot paste into disabled node', target);
	}
	if (target.readOnly) {
		throw reason('cannot paste into read-only node', target);
	}
	this.logger.debug('paste', target);
	highlight(target);

	const value = target.value,
		start = target.selectionStart || value.length,
		end = target.selectionEnd || value.length;
	delete target.value;
	target.value = value.substr(0, start) +
		text +
		value.substr(end, value.length);

	trigger(target, 'ClipboardEvent', 'paste');
	'oninput' in window ?
		trigger(target, 'Event', 'input', {cancellable: false}) :
		trigger(target, 'Event', 'change', {cancellable: false});
}
