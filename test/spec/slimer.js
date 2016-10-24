'use strict';

const child = require('child_process'),
	slimerjs = require('slimerjs'),
	Tasty = require('../..');

const URL = 'http://localhost:8765/test.html';

describe('SlimerJS', function() {
	this.timeout(30000);

	let tasty, slimer;
	afterEach(() => {
		slimer.kill();

		return tasty.stop();
	});

	it('passes Jasmine suite', function(done) {
		this.slow(10000);

		tasty = new Tasty({
			coverage: 'istanbul',
			coverageReporter: 'lcovonly',
			include: 'test/self/jasmine/*.js',
			runner: 'jasmine',
			runnerReporter: 'jasmine-spec-reporter',
			static: 'test/root'
		});

		tasty.start()
			.then(() => {
				slimer = run();
			});
		tasty.once('end', (id, error) => done(error));
	});

	it('passes QUnit suite', function(done) {
		this.slow(10000);

		tasty = new Tasty({
			coverage: 'istanbul',
			coverageReporter: 'lcovonly',
			include: 'test/self/qunit/*.js',
			runner: 'qunit',
			static: 'test/root'
		});

		tasty.start()
			.then(() => {
				slimer = run();
			});
		tasty.once('end', (id, error) => done(error));
	});

	// NOTE this one produces maximum client coverage.
	it('passes Mocha suite', function(done) {
		this.slow(10000);

		tasty = new Tasty({
			addon: 'chai,chai-as-promised',
			coverage: 'istanbul',
			coverageReporter: 'lcovonly',
			include: 'test/self/mocha/*.js',
			static: 'test/root'
		});

		tasty.start()
			.then(() => {
				slimer = run();
			});
		tasty.once('end', (id, error) => done(error));
	});
});

function run() {
	return child.execFile(
		slimerjs.path,
		[
			'test/slimer.js',
			URL,
			'–error-log-file=slimer.log'
		],
		(error) => {
			error && !error.killed &&
				console.error(error);
		}
	);
}
