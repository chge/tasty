'use strict';

const glob = require('glob'),
	files = glob.sync(__dirname + '/../common/*.js');
files.map(file => require(file)).forEach(suites => suites.forEach(suite => {

	suite.skip ?
		xdescribe(suite.name, () => {}) :
		describe(suite.name, function() {
			suite.specs.map(spec => {
				spec.skip ?
					xit(spec.name) :
					it(spec.name, function(done) {
						// TODO spec.time;
						spec.body();
						queue(done);
					}, suite.timeout || spec.timeout || 2000);
			});
		});

}));

