'use strict';

const child = require('child_process'),
	fs = require('fs'),
	http = require('http'),
	slimerjs = require('slimerjs'),
	Tasty = require('../..');

const URL = 'http://localhost:8765',
	URL1 = URL + '/test.html',
	URL2 = 'http://localhost:9876/path/path.html';

describe('SlimerJS', function() {
	this.timeout(60000);

	let tasty, server, slimer;
	afterEach(() => {
		server &&
			server.close();
		slimer &&
			slimer.kill();

		return tasty &&
			tasty.stop();
	});

	it('works with custom path', function(done) {
		this.slow(10000);

		server = http.createServer(
			(request, response) => fs.createReadStream(__dirname + '/../root/path.html').pipe(response)
		).listen(9876);
		tasty = new Tasty({
			url: URL + '/path'
		});

		tasty.start()
			.then(() => {
				slimer = run(URL2);
			});
		tasty.once('end', (id, error) => done(error));
	});

	it('passes Jasmine suite', function(done) {
		this.slow(20000);

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
				slimer = run(URL1);
			});
		tasty.once('end', (id, error) => done(error));
	});

	it('passes QUnit suite', function(done) {
		this.slow(20000);

		tasty = new Tasty({
			coverage: 'istanbul',
			coverageReporter: 'lcovonly',
			include: 'test/self/qunit/*.js',
			runner: 'qunit',
			static: 'test/root'
		});

		tasty.start()
			.then(() => {
				slimer = run(URL1);
			});
		tasty.once('end', (id, error) => done(error));
	});

	// NOTE this one produces maximum client coverage.
	it('passes Mocha suite', function(done) {
		this.slow(20000);

		tasty = new Tasty({
			addon: 'chai,chai-as-promised,chai-spies',
			coverage: 'nyc',
			coverageReporter: 'lcovonly',
			include: 'test/self/mocha/*.js',
			static: 'test/root'
		});

		tasty.start()
			.then(() => {
				slimer = run(URL1);
			});
		tasty.once('end', (id, error) => done(error));
	});
});

function run(url) {
	return child.execFile(
		slimerjs.path,
		[
			'test/slimer.js',
			url,
			'–error-log-file=slimer.log'
		],
		(error) => {
			error && !error.killed &&
				console.error(error);
		}
	);
}
