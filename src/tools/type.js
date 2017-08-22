import { highlight, trigger } from '../dom';
import { delay, Promise, random, reason, reduce } from '../utils';

export default function type(text) {
	const node = document.activeElement;
	if (!node) {
		throw reason('no active node to type into');
	}
	if (!('value' in node)) {
		throw reason('cannot type into active node', node);
	}
	if (node.disabled) {
		throw reason('cannot type into disabled node', node);
	}
	if (node.readOnly) {
		throw reason('cannot type into read-only node', node);
	}
	this.logger.debug('type', node);
	highlight(node);

	return reduce(
		text.split(''),
		(chain, char, i) => chain.then(
				() => i && delay(random(1, 100))
			).then(
				() => {
					const value = node.value,
						start = node.selectionStart || value.length,
						end = node.selectionEnd || value.length;
					try {
						delete node.value;
					} catch (thrown) {
						// NOTE noop
					}
					node.value = value.substr(0, start) +
						char +
						value.substr(end, value.length);

					'oninput' in window ?
						trigger(node, 'Event', 'input', {cancellable: false}) :
						trigger(node, 'Event', 'change', {cancellable: false});
				}
			),
		Promise.resolve()
	);
}
