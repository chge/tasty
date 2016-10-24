'use strict';

export default log;

let console;

function log(logger) {
	logger = logger || {};

	const wrap = (method) => function() {
		method &&
			Function.prototype.apply.call(method, logger, arguments);
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
