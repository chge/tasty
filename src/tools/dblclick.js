import find from './find';

import { dblclick, highlight } from '../dom';
import { reason } from '../utils';

export default function(what, where, options) {
	const tasty = this,
		found = find(what, where, options);
	if (!found) {
		throw reason('no', what, 'in', where, 'to', 'dblclick');
	}
	tasty.logger.debug('dblclick', found);

	highlight(found);
	dblclick(
		found,
		tasty.flaws.navigation
	);
}
