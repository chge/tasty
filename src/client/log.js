'use strict';

module.exports = log;

function log(...args) {
	log.logger.log('tasty', ...args);
}

log.log = log;

log.debug = function debug(...args) {
	log.logger.debug('tasty', ...args);
};

log.info = function info(...args) {
	log.logger.info('tasty', ...args);
};

log.error = function error(...args) {
	log.logger.error('tasty', ...args);
};
