'use strict';

module.exports = {
	instrument: instrument,
	report: report
};

const path = require('path');

const log = require('./log'),
	util = require('./util');

const resolve = util.resolve;

function instrument(code, name, config) {
	switch (config.coverage.instrumenter) {
		case 'istanbul':
			const istanbul = require(resolve('istanbul')),
				instrumenter = new istanbul.Instrumenter();

			// NOTE Istanbul instruments code synchronously under the hood.
			// TODO async worker process for large codebase.
			return instrumenter.instrumentSync(code, name.replace('/', path.sep));
		default:
			// TODO resolve plugins.
			throw new Error(`unknown coverage instrumenter '${config.coverage.instrumenter}'`);
	}
}

function report(data, config) {
	switch (config.coverage.instrumenter) {
		case 'istanbul':
			const istanbul = require(resolve('istanbul')),
				collector = new istanbul.Collector(),
				reporter = new istanbul.Reporter();

			collector.add(data);
			reporter.add(config.coverage.reporter || 'text');

			return new Promise(
				(resolve) => reporter.write(collector, false, resolve)
			);
		default:
			// TODO resolve plugins.
			throw new Error(`unknown coverage reporter '${config.coverage.reporter}'`);
	}
}
