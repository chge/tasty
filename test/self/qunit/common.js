'use strict';

const glob = require('glob'),
	files = glob.sync(__dirname + '/../common/default.js');
files.map(file => require(file)).forEach(suites => suites.forEach(suite => {

	if (suite.skip) {
		QUnit.module(suite.name);
		QUnit.skip(suite.name);
	} else {
		QUnit.module(suite.name);
		suite.specs.map((spec) => {
			QUnit.config.testTimeout = suite.timeout || spec.timeout || 2000;
			spec.skip ?
				QUnit.skip(spec.name) :
				QUnit.test(spec.name, (assert) => {
					assert.expect(1);
					const done = assert.async();
					// TODO spec.time;
					spec.body();
					queue(() => {
						assert.ok(true);
						done();
					});
				});
		});
	}

}));
