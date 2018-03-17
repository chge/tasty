'use strict';

const path = require('path'),
	util = require('../util'),
	Coverage = require('./base');

class NycCoverage extends Coverage {
	/**
	 * @private
	 */
	constructor(tasty) {
		super(tasty);

		const config = tasty.config,
			nyc = util.resolve('nyc'),
			Instrumenter = require(
				path.join(nyc, '..', 'lib', 'instrumenters', 'istanbul')
			);
		this.coverage = require(
			path.join(nyc, '..', 'node_modules', 'istanbul-lib-coverage')
		);
		this.output = config.coverageOutput || 'coverage';
		this.reporter = config.coverageReporter || 'lcovonly';
		this.instrumenter = new Instrumenter(null, {});
		this.map = this.coverage.createCoverageMap({});
		this.reportLib = require(
			path.join(nyc, '..', 'node_modules', 'istanbul-lib-report')
		);
		this.reports = require(
			path.join(nyc, '..', 'node_modules', 'istanbul-reports')
		);
	}

	instrument(code, name) {
		return new Promise(
			(resolve, reject) => {
				try {
					resolve(
						this.instrumenter.instrumentSync(
							code,
							// WORKAROUND: Istanbul requires consistent separators.
							name.replace(/\//g, path.sep)
						)
					);
				} catch (thrown) {
					reject(thrown);
				}
			}
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

module.exports = NycCoverage;
