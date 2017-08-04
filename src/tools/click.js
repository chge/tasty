import find from './find';

import { click, highlight } from '../dom';
import { reason } from '../utils';

export default function(what, where, options) {
	const tasty = this,
		found = find(what, where, options);
	if (!found) {
		throw reason('no', what, 'in', where, 'to', 'click');
	}
	tasty.logger.debug('click', found);

	highlight(found);
	click(
		found,
		tasty.flaws.navigation
	);
}
