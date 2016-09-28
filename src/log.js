'use strict';

module.exports = log;

log.prefix = 'tasty';

function log(...args) {
	let logger = log.logger;
	if (!logger) {
		return;
	}

	logger.log &&
		logger.log.apply(
			logger,
			log.prefix ?
				[log.prefix].concat(args) :
				args
		);
}
