'use strict';

const glob = require('glob'),
	files = glob.sync(__dirname + '/../common/*.js');
files.map(file => require(file)).forEach(suites => suites.forEach(suite => {

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
}));
