'use strict';

const glob = require('glob'),
	files = glob.sync(__dirname + '/../common/*.js');
files.map(file => require(file)).forEach(suites => suites.forEach(suite => {

	suite.skip ?
		describe.skip(suite.name) :
		describe(suite.name, function() {
			suite.timeout &&
				this.timeout(suite.timeout);
			suite.specs.map((spec) => {
				spec.skip ?
					it.skip(spec.name) :
					it(spec.name, function() {
						spec.timeout &&
							this.timeout(spec.timeout);
						spec.time &&
							this.slow(spec.time);
						spec.body();
						return queue();
					});
			});
		});

}));
