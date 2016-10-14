'use strict';

module.exports = {
	Jasmine: JasmineHelper,
	Mocha: MochaHelper,
	QUnit: QUnitHelper
}

const glob = require('glob').sync;

function JasmineHelper(pattern) {
	load(pattern, (suite) => {
		jasmine.DEFAULT_TIMEOUT_INTERVAL = 2000;

		function run(fn, done) {
			fn();
			queue().then(done, done.fail);
		}

		suite.skip ?
			xdescribe(suite.name, () => {}) :
			describe(suite.name, function() {
				suite.beforeEach &&
					beforeEach(
						(done) => run(suite.beforeEach, done)
					);
				suite.afterEach &&
					afterEach(
						(done) => run(suite.afterEach, done)
					);

				suite.specs.map(spec => {
					spec.skip ?
						xit(spec.name) :
						it(
							spec.name,
							// TODO spec.time;
							(done) => run(spec.body, done),
							spec.timeout ||
								suite.timeout
						);
				});
			});
	});
}

function MochaHelper(pattern) {
	load(pattern, (suite) => {
		function run(fn, timeout, time) {
			timeout &&
				this.timeout(timeout);
			time &&
				this.slow(time);
			fn();

			return queue();
		}

		suite.skip ?
			describe.skip(suite.name, function() {}) :
			describe(suite.name, function() {
				suite.beforeEach &&
					beforeEach(function() {
						return run.call(this, suite.beforeEach, suite.timeout);
					});
				suite.afterEach &&
					afterEach(function() {
						return run.call(this, suite.afterEach, suite.timeout);
					});
				suite.timeout &&
					this.timeout(suite.timeout);

				suite.specs.map((spec) => {
					spec.skip ?
						it.skip(spec.name) :
						it(spec.name, function() {
							return run.call(this, spec.body, spec.timeout, spec.time);
						});
				});
			});
	});
}

function QUnitHelper(pattern) {
	load(pattern, (suite) => {
		function run(fn, assert, timeout) {
			QUnit.config.testTimeout = timeout;

			//assert.expect(1);
			fn();

			return queue().then(
				() => assert.ok(true),
				(error) => assert.ok(false, error.message)
			);
		}

		QUnit.module(suite.name, {
			beforeEach: suite.beforeEach ?
				(assert) => run(suite.beforeEach, assert) :
				null,
			afterEach: suite.afterEach ?
				(assert) => run(suite.afterEach, assert) :
				null,
		});

		suite.specs.map((spec) => {
			suite.skip || spec.skip ?
				QUnit.skip(spec.name) :
				QUnit.test(
					spec.name,
					// TODO spec.time;
					(assert) => run(
						spec.body,
						assert,
						spec.timeout ||
							suite.timeout ||
								2000
					)
				);
		});
	});
}

function load(pattern, visitor) {
	glob(pattern)
		.map(
			(file) => require(file)
		)
		.forEach(
			(suites) => suites.forEach(
				(suite) => visitor(suite)
			)
		);
}
