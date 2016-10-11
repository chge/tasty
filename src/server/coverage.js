'use strict';

module.exports = createCoverage;

const separator = require('path').sep;

const util = require('./util');

const resolve = util.resolve;

class IstanbulCoverage {
	constructor(format) {
		const istanbul = require(resolve('istanbul'));
		this.instrumenter = new istanbul.Instrumenter();
		this.collector = new istanbul.Collector();
		this.reporter = new istanbul.Reporter();
		this.reporter.add(format || 'lcovonly');
	}

	instrument(code, name) {
		// NOTE Istanbul instruments code synchronously under the hood.
		// TODO async worker process for large codebase?
		return new Promise(
			(resolve, reject) => this.instrumenter.instrument(
				code,
				// WORKAROUND: Istanbul requires consistent separators.
				name.replace(/\//g, separator),
				(error, instrumented) => error ?
					reject(error) :
					resolve(instrumented)
			)
		);
	}

	report(data, type) {
		this.collector.add(data);

		return new Promise(
			(resolve, reject) => this.reporter.write(
				this.collector,
				false,
				(error) => error ?
					reject(error) :
					resolve()
			)
		);
	}
}

function createCoverage(config) {
	switch (config.coverage) {
		case 'istanbul':
			return new IstanbulCoverage(config.format);
		default:
			// TODO resolve plugins.
			throw new Error(`unknown coverage '${config.coverage}'`);
	}
}
