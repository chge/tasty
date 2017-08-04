import { highlight, trigger } from '../dom';
import { delay, random, reason, thenable } from '../utils';

export default function(count) {
	const target = document.activeElement;
	if (target === document.body) {
		throw reason('no active node to clear');
	}
	if (!('value' in target)) {
		throw reason('wrong active node', target, 'to clear');
	}
	if (target.disabled) {
		throw reason('disabled active node', target, 'to clear');
	}
	if (target.readOnly) {
		throw reason('read-only active node', target, 'to clear');
	}
	this.logger.debug('clear', target);
	highlight(target);

	return thenable((resolve) => {
		let chain = thenable(),
			length = count === true ? 1 : (count | 0) || target.value.length,
			i;
		for (i = 0; i < length; i++) {
			chain = chain
				.then(
					() => i && delay(random(1, 100))
				)
				.then(
					() => {
						// TODO support selection?
						if (count === true) {
							target.value = '';
						} else {
							target.value = target.value.substr(0, target.value.length - 1);
						}

						'oninput' in window ?
							trigger(target, 'Event', 'input', {cancellable: false}) :
							trigger(target, 'Event', 'change', {cancellable: false});
					}
				);
		}

		resolve(chain);
	});
}
