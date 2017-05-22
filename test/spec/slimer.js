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
	// WORKAROUND
	if (process.argv.indexOf('--headful') !== -1) {
		return it.skip('spec skipped');
	}

	this.retries(1);
	this.timeout(60000);

	let server, slimer, tasty;
	afterEach(() => {
		server && server.close();
		slimer && slimer.kill();

		return tasty && tasty.stop().catch(() => {});
	});

	it('works with custom path', function(done) {
		this.slow(10000);

		server = http.createServer(
			(request, response) => fs.createReadStream(__dirname + '/../root/path.html').pipe(response)
		).listen(9876);
		tasty = new Tasty({
			quiet: false,
			url: URL + '/path'
		});

		tasty.once('end', (id, error) => done(error));
		tasty.start()
			.then(() => {
				slimer = spawn('path', URL2);
			});
	});

	it('passes Jasmine suite', function(done) {
		this.slow(20000);

		tasty = new Tasty({
			coverage: 'istanbul',
			coverageReporter: 'lcovonly',
			include: 'test/self/jasmine/*.js',
			quiet: false,
			runner: 'jasmine',
			runnerReporter: 'jasmine-spec-reporter',
			static: 'test/root'
		});

		tasty.once('end', (id, error) => done(error));
		tasty.start()
			.then(() => {
				slimer = spawn('jasmine', URL1);
			});
	});

	it('passes QUnit suite', function(done) {
		this.slow(20000);

		tasty = new Tasty({
			coverage: 'istanbul',
			coverageReporter: 'lcovonly',
			include: 'test/self/qunit/*.js',
			quiet: false,
			runner: 'qunit',
			static: 'test/root'
		});

		tasty.once('end', (id, error) => done(error));
		tasty.start()
			.then(() => {
				slimer = spawn('qunit', URL1);
			});
	});

	// NOTE this one produces maximum client coverage.
	it('passes Mocha suite', function(done) {
		this.slow(20000);

		tasty = new Tasty({
			addon: 'chai,chai-as-promised,chai-spies',
			coverage: 'istanbul',
			coverageReporter: 'lcovonly',
			include: 'test/self/mocha/*.js',
			quiet: false,
			static: 'test/root'
		});

		tasty.once('end', (id, error) => done(error));
		tasty.start()
			.then(() => {
				slimer = spawn('mocha', URL1);
			});
	});
});

function spawn(name, url) {
	name = name || 'unknown';

	return child.exec(
		[
			slimerjs.path,
			process.platform === 'win32' ?
				'-error-log-file firefox.' + name + '.error.log' :
				'--error-log-file=firefox.' + name + '.error.log',
			'test/slimer.js',
			url,
			'> slimer.' + name + '.log'
		].join(' ')
	).on(
		'error',
		(error) => console.error(error)
	);
}
