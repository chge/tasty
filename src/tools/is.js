import find from './find';

import { highlight } from '../dom';
import { reason } from '../utils';

export default function is(what, where, options) {
	const found = find(what, where, options, {reachable: true});
	if (found) {
		highlight(found);
	} else {
		throw reason('no', what, 'in', where);
	}
}
