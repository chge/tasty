const chai = require('chai'),
	expect = chai.expect,
	tasty = require('../..');

describe('tasty', function() {
	afterEach(function() {
		tasty.finish();
	});

	it('exports API', function() {
		tasty({
			static: true
		}).start();
	});

	it('supports logging', function() {
		tasty({
			log: {
				log: () => {}
			}
		}).start();
	});

	it('supports coverage', function() {
		tasty({
			coverage: 'istanbul'
		}).start();
	});

	it('supports static', function() {
		tasty({
			static: true
		}).start();
	});

	it('fails without server', function() {
		expect(function() {
			tasty({
				server: false
			});
		}).to.throw(Error);
	});

	it('fails on wrong configration', function() {
		expect(function() {
			tasty({
				bail: true,
				runner: 'jasmine'
			});
		}).to.throw(Error);
	});
});
