import { reason, thenable } from '../utils';

export default function history(value) {
	value = value | 0;
	if (!value) {
		throw reason('history', 'invalid value');
	}
	if (value < 0 && window.history.length <= -value) {
		throw reason('history', 'length', 'is', window.history.length);
	}

	return thenable(() => {
		// NOTE never resolve.
		window.history.go(value);
	});
}
