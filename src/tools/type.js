import { highlight, trigger } from '../dom';
import { delay, Promise, random, reason, reduce } from '../utils';

export default function type(text) {
	const target = document.activeElement;
	if (!('value' in target)) {
		throw reason('cannot type into active node', target);
	}
	if (target.disabled) {
		throw reason('cannot type into disabled node', target);
	}
	if (target.readOnly) {
		throw reason('cannot type into read-only node', target);
	}
	this.logger.debug('type', target);
	highlight(target);

	return reduce(
		text.split(''),
		(chain, char, i) => chain.then(
				() => i && delay(random(1, 100))
			).then(
				() => {
					const value = target.value,
						start = target.selectionStart || value.length,
						end = target.selectionEnd || value.length;
					target.value = value.substr(0, start) +
						char +
						value.substr(end, value.length);

					'oninput' in window ?
						trigger(target, 'Event', 'input', {cancellable: false}) :
						trigger(target, 'Event', 'change', {cancellable: false});
				}
			),
		Promise.resolve()
	);
}
