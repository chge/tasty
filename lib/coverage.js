'use strict';

const Coverage = require('./coverage/base'),
	util = require('./util');

function getCoverage(config) {
	const coverage = config.coverage;

	switch (coverage) {
		case 'istanbul':
			return require('./coverage/istanbul');
		case 'nyc':
			return require('./coverage/nyc');
		default:
			return typeof coverage === 'string' && coverage ?
				require(
					util.resolve(coverage)
				) :
				coverage;
	}
}

module.exports = {
	Coverage: Coverage,
	getCoverage: getCoverage
};
