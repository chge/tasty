'use strict';

const sandbox = require('tasty-sandbox'),
	util = require('../util'),
	Runner = require('./base');

class JasmineRunner extends Runner {
	/**
	 * @private
	 */
	constructor(tasty, client) {
		super(tasty, client);

		const config = tasty.config,
			Jasmine = sandbox.require(
				util.resolve('jasmine'),
				this.context
			),
			jasmine = new Jasmine();

		jasmine.loadConfig({
			spec_files: this.files
		});

		if (config.runnerReporter) {
			// TODO sandbox.
			// NOTE sandbox breaks some Jasmine reporters.
			let Reporter = require(
				util.resolve(config.runnerReporter)
			);

			// WORKAROUND
			Reporter = typeof Reporter === 'function' ?
				Reporter :
				Reporter[Object.keys(Reporter)[0]];

			jasmine.configureDefaultReporter &&
				jasmine.configureDefaultReporter({
					print: () => {}
				});
			jasmine.env.clearReporters();
			jasmine.addReporter(
				new Reporter()
			);
		} else {
			jasmine.configureDefaultReporter &&
				jasmine.configureDefaultReporter({
					showColors: config.colors
				});
		}

		jasmine.addReporter({
			specStarted: (spec) => this.onTest(spec.fullName),
			specDone: (spec) => {
				if (spec.status === 'failed') {
					const fail = spec.failedExpectations[0],
						error = new Error(fail.message);
					error.stack = fail.stack;
					this.failed++;
					this.onFail(spec.fullName, error);
				} else {
					this.onPass(spec.fullName);
				}
			}
		});

		this.failed = 0;
		this.jasmine = jasmine;
	}

	run() {
		return new Promise((resolve, reject) => {
			this.jasmine.onComplete((passed) => {
				if (passed) {
					resolve();
				} else {
					const error = new Error(`${this.failed} failed`);
					error.code = this.failed;
					reject(error);
				}
			});

			this.jasmine.execute();
		});
	}
}

module.exports = JasmineRunner;
