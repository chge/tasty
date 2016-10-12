'use strict';

module.exports = {
	init: init
};

let console;

function init(logger) {
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
