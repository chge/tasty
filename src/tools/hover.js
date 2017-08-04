import find from './find';

import { hover } from '../dom';
import { reason } from '../utils';

export default function(what, where, options) {
	const found = find(what, where, options);
	if (!found) {
		throw reason('no', what, 'in', where, 'to', 'hover');
	}
	this.logger.debug('hover', found);

	// TODO highlight?
	hover(found);
}
