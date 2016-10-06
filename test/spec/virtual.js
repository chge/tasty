const chai = require('chai'),
	child = require('child_process'),
	expect = chai.expect,
	tasty = require('../..');

const URL = 'http://localhost:5678';

function exec(command) {
	return child.exec(
		command,
		{
			cwd: process.cwd()
		}
	);
}

describe('client', function() {
	this.timeout(60000);

	afterEach(function() {
		tasty.finish();
	});

	it('passes jasmine suite', function(done) {
		this.slow(20000);

		tasty({
			coverage: {
				instrumenter: 'istanbul',
				reporter: 'lcovonly',
			},
			include: 'test/self/jasmine/*.js',
			runner: 'jasmine',
			reporter: 'jasmine-spec-reporter',
			static: {
				root: 'test/res'
			}
		}).start();

		const phantom = exec('phantomjs test/phantom.js');

		tasty.once('finish', () => {
			phantom.kill();
			done();
		});
	});

	it('passes mocha suite', function(done) {
		this.slow(20000);

		tasty({
			assert: 'chai',
			coverage: {
				instrumenter: 'istanbul',
				reporter: 'lcovonly',
			},
			expect: 'chai',
			include: 'test/self/mocha/*.js',
			static: {
				root: 'test/res'
			}
		}).start();

		const phantom = exec('phantomjs test/phantom.js');

		tasty.once('finish', () => {
			phantom.kill();
			done();
		});
	});

	it('passes qunit suite', function(done) {
		this.slow(20000);

		tasty({
			coverage: {
				instrumenter: 'istanbul',
				reporter: 'lcovonly',
			},
			include: 'test/self/qunit/*.js',
			runner: 'qunit',
			static: {
				root: 'test/res'
			}
		}).start();

		const phantom = exec('phantomjs test/phantom.js');

		tasty.once('finish', () => {
			phantom.kill();
			done();
		});
	});
});
