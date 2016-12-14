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
			now().then(done, done.fail);
		}

		const suiteMethod = suite.skip ?
			xdescribe :
			suite.only ?
				fdescribe :
				describe;
		suiteMethod(suite.name, function() {
			suite.beforeEach &&
				beforeEach(
					(done) => run(suite.beforeEach, done)
				);
			suite.afterEach &&
				afterEach(
					(done) => run(suite.afterEach, done)
				);

			suite.specs.map(spec => {
				const specMethod = spec.skip ?
					xit :
					spec.only ?
						fit :
						it;
				specMethod(
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

			return now();
		}

		const suiteMethod = suite.skip ?
			describe.skip :
			suite.only ?
				describe.only :
				describe;
		suiteMethod(suite.name, function() {
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
				const specMethod = spec.skip ?
					it.skip :
					spec.only ?
						it.only :
						it;
				specMethod(spec.name, function() {
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

			return now().then(
				() => assert.ok(true),
				(error) => assert.ok(false, error.message)
			);
		}

		// TODO suite.only;
		QUnit.module(suite.name, {
			beforeEach: suite.beforeEach ?
				(assert) => run(suite.beforeEach, assert) :
				null,
			afterEach: suite.afterEach ?
				(assert) => run(suite.afterEach, assert) :
				null,
		});

		suite.specs.map((spec) => {
			// TODO spec.only;
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
