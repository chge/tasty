'use strict';

const glob = require('glob'),
	files = glob.sync(__dirname + '/../common/*.js');
files.map(file => require(file)).forEach(suites => suites.forEach(suite => {

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

}));
