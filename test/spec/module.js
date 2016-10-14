'use strict';

const chai = require('chai'),
	expect = chai.expect,
	Tasty = require('../..');

describe('tasty', function() {
	it('exports default API', function() {
		const tasty = new Tasty();
		expect(tasty).to.be.instanceof(Tasty);
	});

	it('exports named API', function() {
		const tasty = new Tasty.Tasty();
		expect(tasty).to.be.instanceof(Tasty);
		expect(tasty).to.be.instanceof(Tasty.Tasty);
		expect(Tasty).to.be.equal(Tasty.Tasty);
	});

	it('clones config', function() {
		const config = {},
			tasty = new Tasty(config);
		expect(tasty.config).not.to.be.equal(config);
	});

	it.skip('applies defaults');

	it('overrides wrong config with defaults', function() {
		const config = {slow: 'foo'},
			tasty = new Tasty(config);
		expect(tasty.config.slow).not.to.be.equal(config.slow);
		expect(config.slow).to.be.equal('foo');
	});

	it('supports logging', function() {
		const tasty = new Tasty({
			log: {
				log: () => {}
			}
		});

		return tasty.start()
			.then(
				() => tasty.stop()
			);
	});

	it('supports coverage', function() {
		const tasty = new Tasty({
			coverage: 'istanbul'
		});

		return tasty.start()
			.then(
				() => tasty.stop()
			);
	});

	it('supports static', function() {
		const tasty = new Tasty({
			static: true
		});

		return tasty.start()
			.then(
				() => tasty.stop()
			);
	});

	it('throws without server', function() {
		expect(() => {
			new Tasty({
				server: false
			});
		}).to.throw(Error);
	});

	it('throws on unknown coverage toolchain', function() {
		expect(() => {
			new Tasty({
				coverage: 'big-kahuna-coverage'
			});
		}).to.throw(Error);
	});

	it('throws on unknown runner toolchain', function() {
		expect(() => {
			new Tasty({
				coverage: 'runner-royale'
			});
		}).to.throw(Error);
	});

	it('throws on wrong runner configration', function() {
		expect(() => {
			new Tasty({
				bail: true,
				runner: 'jasmine'
			});
		}).to.throw(Error);

		expect(() => {
			new Tasty({
				bail: true,
				runner: 'qunit'
			});
		}).to.throw(Error);
	});
});
