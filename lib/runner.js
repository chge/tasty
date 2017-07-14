'use strict';

const Runner = require('./runner/base'),
	util = require('./util');

function getRunner(config) {
	const runner = config.runner;

	switch (runner) {
		case 'jasmine':
			// TODO support with hacks?
			if (config.bail) {
				throw new TypeError('Jasmine doesn\'t support bail');
			}

			return require('./runner/jasmine');
		case 'mocha':
			return require('./runner/mocha');
		case 'qunit':
			// TODO support with hacks?
			if (config.bail) {
				throw new TypeError('QUnit doesn\'t support bail');
			}

			return require('./runner/qunit');
		default:
			return typeof runner === 'string' ?
				require(
					util.resolve(runner)
				) :
				runner;
	}
}

module.exports = {
	Runner: Runner,
	getRunner: getRunner
};
