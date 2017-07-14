'use strict';

const sandbox = require('tasty-sandbox'),
	util = require('../util'),
	Runner = require('./base');

class MochaRunner extends Runner {
	/**
	 * @private
	 */
	constructor(tasty, client) {
		super(tasty, client);

		const config = tasty.config,
			Mocha = sandbox.require(
				util.resolve('mocha'),
				this.context
			);

		this.mocha = new Mocha({
			ui: config.ui || 'bdd', // TODO configure properly.
			bail: config.bail,
			reporter: config.runnerReporter ?
				// WORKAROUND for 3rd-party reporters.
				config.runnerReporter.indexOf('mocha-') === 0 ?
					require(
						util.resolve(config.runnerReporter)
					) :
					config.runnerReporter :
				'spec'
		});

		this.files.forEach(
			(file) => this.mocha.addFile(file)
		);
	}

	run() {
		return new Promise((resolve, reject) => {
			this.mocha.run((failed) => {
				if (failed) {
					const error = new Error(`${failed} failed`);
					error.code = failed;
					reject(error);
				} else {
					resolve();
				}
			})
				.on(
					'test',
					(test) => this.onTest(test.fullTitle())
				)
				.on(
					'pass',
					(test) => this.onPass(test.fullTitle())
				)
				.on(
					'fail',
					(test, error) => this.onFail(test.fullTitle(), error)
				)
		});
	}
}

module.exports = MochaRunner;
