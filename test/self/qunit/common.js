'use strict';

const glob = require('glob'),
	files = glob.sync(__dirname + '/../common/*.js');
files.map(file => require(file)).forEach(suites => suites.forEach(suite => {

	if (suite.skip) {
		QUnit.module(suite.name);
		QUnit.skip(suite.name);
	} else {
		QUnit.module(suite.name, {
			beforeEach: suite.beforeEach || null,
			afterEach: suite.afterEach || null
		});

		suite.specs.map((spec) => {
			QUnit.config.testTimeout = suite.timeout ||
				spec.timeout ||
					2000;

			spec.skip ?
				QUnit.skip(spec.name) :
				QUnit.test(spec.name, (assert) => {
					const done = assert.async();
					// TODO spec.time;

					assert.expect(1);

					spec.body();
					queue().then(() => {
						assert.ok(true);
						done();
					}, done);
				});
		});
	}

}));
