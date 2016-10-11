'use strict';

const chai = require('chai'),
	expect = chai.expect,
	Tasty = require('../..');

describe('tasty', function() {
	it('exports default API', function() {
		const tasty = new Tasty();

		return tasty.start()
			.then(
				() => tasty.close()
			);
	});

	it('exports named API', function() {
		const tasty = new Tasty.Tasty();

		return tasty.start()
			.then(
				() => tasty.close()
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
				() => tasty.close()
			);
	});

	it('supports coverage', function() {
		const tasty = new Tasty({
			coverage: 'istanbul'
		});

		return tasty.start()
			.then(
				() => tasty.close()
			);
	});

	it('supports static', function() {
		const tasty = new Tasty({
			static: true
		});

		return tasty.start()
			.then(
				() => tasty.close()
			);
	});

	it('fails without server', function() {
		expect(function() {
			new Tasty({
				server: false
			});
		}).to.throw(Error);
	});

	it('fails on wrong configration', function() {
		expect(function() {
			new Tasty({
				bail: true,
				runner: 'jasmine'
			});
		}).to.throw(Error);
	});
});
