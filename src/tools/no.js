import find from './find';

import { highlight } from '../dom';
import { format, reason } from '../utils';

export default function no(what, where, options) {
	const found = find(what, where, options, {reachable: true});
	if (found) {
		highlight(found);
		throw reason('found', what, 'in', where, 'as', format(found));
	}
}
