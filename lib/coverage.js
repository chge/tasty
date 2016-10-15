'use strict';

module.exports = createCoverage;

const fs = require('fs'),
	path = require('path');

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

class NycCoverage {
	constructor(format) {
		const NYC = require(resolve('nyc')),
			nyc = new NYC({
				reporter: format,
				tempDirectory: 'coverage'
			});
		nyc.reset();
		this.instrumenter = nyc.instrumenter();
		this.nyc = nyc;
	}

	instrument(code, name) {
		// NOTE NYC instruments code synchronously under the hood.
		return new Promise(
			(resolve, reject) => this.instrumenter.instrument(
				code,
				// WORKAROUND: NYC requires consistent separators.
				name.replace(/\//g, path.sep),
				(error, instrumented) => error ?
					reject(error) :
					resolve(instrumented)
			)
		);
	}

	report(data, type) {
		// NOTE NYC reports coverage synchronously under the hood.
		return new Promise((resolve, reject) => {
			try {
				// WORKAROUND: NYC has no documented coverage input.
				fs.writeFile(
					path.resolve('coverage', this.nyc.generateUniqueID() + '.json'),
					JSON.stringify(data),
					(error) => {
						if (error) {
							reject(error);
						} else {
							this.nyc.report();
							resolve();
						}
					}
				);
			} catch (thrown) {
				reject(thrown);
			}
		});
	}
}

function createCoverage(config) {
	switch (config.coverage) {
		case 'istanbul':
			return new IstanbulCoverage(config.format);
		case 'nyc':
			return new NycCoverage(config.format);
		default:
			// TODO resolve plugins.
			throw new Error(`unknown coverage '${config.coverage}'`);
	}
}
