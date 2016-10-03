'use strict';

const glob = require('glob'),
	files = glob.sync(__dirname + '/../common/*.js');
files.map(file => require(file)).forEach(suites => suites.forEach(suite => {

	function run(fn, timeout, time) {
		spec.timeout &&
			this.timeout(spec.timeout);
		spec.time &&
			this.slow(spec.time);
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

}));
