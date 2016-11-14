'use strict';

module.exports = createCoverage;

const path = require('path');

const util = require('./util');

const resolve = util.resolve;

class IstanbulCoverage {
	/**
	 * @private
	 */
	constructor(reporter, output) {
		this.initialize(reporter, output);
	}

	initialize(reporter, output) {
		const istanbul = require(resolve('istanbul'));
		this.instrumenter = new istanbul.Instrumenter();
		this.collector = new istanbul.Collector();
		this.reporter = new istanbul.Reporter(null, output);
		this.reporter.add(reporter);
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

class NycCoverage extends IstanbulCoverage {
	initialize(reporter, output) {
		const nyc = resolve('nyc'),
			Instrumenter = require(
				path.join(nyc, '..', 'lib', 'instrumenters', 'istanbul')
			);
		this.coverage = require(
			path.join(nyc, '..', 'node_modules', 'istanbul-lib-coverage')
		);
		this.output = output;
		this.reporter = reporter;
		this.instrumenter = new Instrumenter(null, {});
		this.map = this.coverage.createCoverageMap({});
		this.reportLib = require(
			path.join(nyc, '..', 'node_modules', 'istanbul-lib-report')
		);
		this.reports = require(
			path.join(nyc, '..', 'node_modules', 'istanbul-reports')
		);
	}

	collect(data) {
		return new Promise((resolve, reject) => {
			try {
				this.map.merge(
					this.coverage.createCoverageMap(data)
				);
				resolve();
			} catch (thrown) {
				reject(thrown);
			}
		});
	}

	report() {
		// NOTE NYC writes report synchronously under the hood.
		return new Promise((resolve, reject) => {
			try {
				this.reportLib.summarizers.pkg(this.map)
					.visit(
						this.reports.create(this.reporter),
						this.reportLib.createContext({
							dir: this.output
						})
					);
				resolve();
			} catch (thrown) {
				reject(thrown);
			}
		});
	}
}

function createCoverage(config) {
	const reporter = config.coverageReporter ||
			'lcovonly',
		output = config.coverageOutput ||
			'coverage';

	switch (config.coverage) {
		case 'istanbul':
			return new IstanbulCoverage(reporter, output);
		case 'nyc':
			return new NycCoverage(reporter, output);
		default:
			// TODO resolve plugins.
			throw new TypeError(`unknown coverage '${config.coverage}'`);
	}
}
