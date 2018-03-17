'use strict';

const path = require('path'),
	util = require('../util'),
	Coverage = require('./base');

class IstanbulCoverage extends Coverage {
	/**
	 * @private
	 */
	constructor(tasty) {
		super(tasty);

		const config = tasty.config,
			istanbul = require(
				util.resolve('istanbul')
			);
		this.instrumenter = new istanbul.Instrumenter();
		this.collector = new istanbul.Collector();
		this.reporter = new istanbul.Reporter(null, config.coverageOutput || 'coverage');
		this.reporter.add(config.coverageReporter || 'lcovonly');
	}

	instrument(code, name) {
		// NOTE Istanbul instruments code synchronously under the hood.
		return new Promise(
			(resolve, reject) => this.instrumenter.instrument(
				code,
				// WORKAROUND: Istanbul requires consistent separators.
				name.replace(/\//g, path.sep),
				(error, instrumented) => error ?
					reject(error) :
					resolve(instrumented)
			)
		);
	}

	collect(data) {
		return new Promise((resolve, reject) => {
			try {
				this.collector.add(data);
				resolve();
			} catch (thrown) {
				reject(thrown);
			}
		});
	}

	report() {
		// NOTE Istanbul writes report synchronously under the hood.
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

module.exports = IstanbulCoverage;
