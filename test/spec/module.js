'use strict';

const chai = require('chai'),
	expect = chai.expect,
	Tasty = require('../..');

describe('tasty', function() {
	it('exports default API', function() {
		const tasty = new Tasty();

		return tasty.start()
			.then(
				() => tasty.stop()
			);
	});

	it('exports named API', function() {
		const tasty = new Tasty.Tasty();

		return tasty.start()
			.then(
				() => tasty.stop()
			);
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

	it('fails without server', function() {
		expect(function() {
			new Tasty({
				server: false
			});
		}).to.throw(Error);
	});

	it('fails on unknown coverage toolchain', function() {
		expect(function() {
			new Tasty({
				coverage: 'big-kahuna-coverage'
			});
		}).to.throw(Error);
	});

	it('fails on unknown runner toolchain', function() {
		expect(function() {
			new Tasty({
				coverage: 'runner-royale'
			});
		}).to.throw(Error);
	});

	it('fails on wrong runner configration', function() {
		expect(function() {
			new Tasty({
				bail: true,
				runner: 'jasmine'
			});
		}).to.throw(Error);
	});
});
