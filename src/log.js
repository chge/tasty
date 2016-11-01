'use strict';

export default log;

import { forEach } from './util';

let console;

function log(logger) {
	logger = logger || {};

	const wrap = (method) => (...args) => {
		// WORKAROUND: IE8 doesn't log spaces between arguments.
		if (window.attachEvent) {
			const fixed = [];
			forEach(
				args,
				(arg) => fixed.push(arg, ' ')
			);
			args = fixed;
		}

		method &&
			Function.prototype.apply.call(method, logger, args);

		return !!method;
	};

	console = {
		debug: wrap(logger.debug),
		log: wrap(logger.log),
		info: wrap(logger.info),
		warn: wrap(logger.warn),
		error: wrap(logger.error)
	};

	return console;
}
