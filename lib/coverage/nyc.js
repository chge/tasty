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
			),
			SourceMaps = require(
				path.join(nyc, '..', 'lib', 'source-maps')
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
		this.sourceMaps = new SourceMaps({});
	}

	instrument(code, name) {
		return new Promise((resolve) => {
			// WORKAROUND: Istanbul requires consistent separators.
			name = name.replace(/\//g, path.sep);

			let map = null;
			try {
				map = this.sourceMaps.extractAndRegister(code, name);
			} catch (thrown) {
				// TODO?
			}

			resolve(
				this.instrumenter.instrumentSync(code, name, map)
			);
		});
	}

	collect(data) {
		return new Promise((resolve) => {
			this.map.merge(
				this.coverage.createCoverageMap(data)
			);
			this.map.data = this.sourceMaps.remapCoverage(
				this.map.data
			);
			resolve();
		});
	}

	report() {
		// NOTE NYC writes report synchronously under the hood.
		return new Promise((resolve) => {
			this.reportLib.summarizers.pkg(this.map)
				.visit(
					this.reports.create(this.reporter),
					this.reportLib.createContext({
						dir: this.output
					})
				);
			resolve();
		});
	}
}

module.exports = NycCoverage;
