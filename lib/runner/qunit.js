'use strict';

const sandbox = require('tasty-sandbox'),
	util = require('../util'),
	Runner = require('./base');

class QUnitRunner extends Runner {
	/**
	 * @private
	 */
	constructor(tasty, client) {
		super(tasty, client);

		const QUnit = sandbox.require(
			util.resolve('qunitjs'),
			this.context
		);

		// NOTE QUnit doesn't have built-in console reporter.
		new QUnitConsoleReporter(QUnit, this.context.globals.console);

		QUnit.testStart(
			(details) => this.onTest(`${details.module} ${details.name}`)
		);
		QUnit.log(
			(details) => {
				const name = `${details.module} ${details.name}`;
				if (details.result) {
					this.onPass(name);
				} else {
					const error = new Error(details.message || `${details.actual} is not ${details.expected}`);
					error.stack = details.source;
					this.onFail(name, error);
				}
			}
		);
		QUnit.config.autostart = false;
		this.QUnit = QUnit;

		this.context.globals.QUnit = QUnit;
	}

	run() {
		return new Promise((resolve, reject) => {
			const QUnit = this.QUnit;

			// TODO configurable reporter.
			QUnit.done((details) => {
				if (details.failed) {
					const error = new Error(`${details.failed} failed`);
					error.code = details.failed;
					reject(error);
				} else {
					resolve();
				}
			});

			this.files.map(
				(file) => sandbox.require(
					require.resolve(process.cwd() + '/' + file),
					this.context
				)
			);

			QUnit.load();
			QUnit.start();
		});
	}
}

/* eslint-disable no-console */
// TODO separate into tasty-qunit-reporter module?
// TODO nested modules and colors.
class QUnitConsoleReporter {
	/**
	 * @private
	 */
	constructor(instance, console) {
		let passed = 0,
			failed = 0,
			skipped = 0,
			errors = [];

		instance.moduleStart(
			(details) => {
				console.log();
				console.log(`  ${details.name}`);
			}
		);
		instance.testDone(
			(details) => {
				details.failed ?
					failed++ :
					details.passed ?
						passed++ :
						skipped++;
				console.log(`    ${details.failed ? '×' : details.passed ? '+' : '-'} ${details.name}${details.total ? ' (' + details.runtime + 'ms)' : ''}`);
			}
		);
		instance.log(
			(details) => details.result || errors.push(details)
		);
		instance.done(
			(details) => {
				console.log();
				console.log(`  ${passed} passed (${details.runtime}ms)`);
				failed &&
					console.log(`  ${failed} failed`);
				skipped &&
					console.log(`  ${skipped} skipped`);
				console.log();
				errors.forEach((details) => {
					console.log(`  ${details.module} ${details.name}`);
					console.log(`  ${details.message || (details.actual + ' is not ' + details.expected)}`);
					console.log(`${details.source}`);
					console.log();
				});
			}
		);
	}
}
/* eslint-enable */

module.exports = QUnitRunner;
