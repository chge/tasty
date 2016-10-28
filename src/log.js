'use strict';

export default log;

let console;

function log(logger) {
	logger = logger || {};

	const wrap = (method) => (...args) => {
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
