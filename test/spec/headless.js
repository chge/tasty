'use strict';

const child = require('child_process'),
	Tasty = require('../..');

const URL = 'http://localhost:8765/test.html';

describe('headless client', function() {
	this.timeout(20000);

	let tasty, phantom;
	afterEach((done) => {
		phantom.once('close', done);
		tasty.stop().then(
			() => phantom.kill()
		);
	});

	it('passes Jasmine suite', function(done) {
		this.slow(10000);

		tasty = new Tasty({
			coverage: 'istanbul',
			format: 'lcovonly',
			headless: true,
			include: 'test/self/jasmine/common.js',
			reporter: 'jasmine-spec-reporter',
			runner: 'jasmine',
			static: 'test/root'
		});

		tasty.start()
			.then(() => {
				phantom = run();
			});
		tasty.once('end', (id, error) => done(error));
	});

	it('passes Mocha suite', function(done) {
		this.slow(10000);

		tasty = new Tasty({
			addon: 'chai,chai-as-promised',
			coverage: 'istanbul',
			format: 'lcovonly',
			headless: true,
			include: 'test/self/mocha/common.js',
			static: 'test/root'
		});

		tasty.start()
			.then(() => {
				phantom = run();
			});
		tasty.once('end', (id, error) => done(error));
	});

	it('passes QUnit suite', function(done) {
		this.slow(10000);

		tasty = new Tasty({
			coverage: 'nyc',
			format: 'lcovonly',
			headless: true,
			include: 'test/self/qunit/common.js',
			runner: 'qunit',
			static: 'test/root'
		});

		tasty.start()
			.then(() => {
				phantom = run();
			});
		tasty.once('end', (id, error) => done(error));
	});
});

function run() {
	return child.exec(`phantomjs test/phantom.js "${URL}"`);
}
