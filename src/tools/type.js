import { highlight, trigger } from '../dom';
import { delay, Promise, random, reason, reduce } from '../utils';

const BACKSPACE = 8,
	NEWLINE = 10,
	ENTER = 13;

export default function type(text) {
	const node = document.activeElement ||
		document.querySelector(':focus');
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
			).then(() => {
				switch (char.charCodeAt(0)) {
					case BACKSPACE: {
						const init = {
							key: 'Backspace',
							charCode: 8
						};
						trigger(node, 'KeyboardEvent', 'keydown', init);
						trigger(node, 'KeyboardEvent', 'keypress', init);
						trigger(node, 'KeyboardEvent', 'keyup', init);
						break;
					}
					case ENTER:
					case NEWLINE: {
						const init = {
							key: 'Enter',
							charCode: 13
						};
						trigger(node, 'KeyboardEvent', 'keydown', init);
						trigger(node, 'KeyboardEvent', 'keypress', init);
						trigger(node, 'KeyboardEvent', 'keyup', init);
						break;
					}
					default: {
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
				}
			}),
		Promise.resolve()
	);
}

type.ENTER = ENTER;
type.NEWLINE = NEWLINE;
