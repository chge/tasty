'use strict';

const chai = require('chai'),
	expect = chai.expect,
	Tasty = require('../..');

chai.use(require('chai-spies'));

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
			console: {
				console: () => {}
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

	it('emits listening event', function() {
		const spy1 = chai.spy(),
			spy2 = chai.spy(),
			tasty = new Tasty();
		tasty.on('listening', spy1);
		tasty.once('listening', spy2);

		return tasty.start()
			.then(() => {
				expect(spy1).to.have.been.called.with(tasty.config.url.href)
				expect(spy2).to.have.been.called.with(tasty.config.url.href)
			})
			.then(
				() => tasty.stop()
			);
	});

	it('emits close event', function() {
		const spy1 = chai.spy(),
			spy2 = chai.spy(),
			tasty = new Tasty();
		tasty.on('listening', spy1);
		tasty.once('listening', spy1);
		tasty.off('listening', spy1);
		tasty.on('close', spy2);
		tasty.once('close', spy2);
		tasty.off('close', spy2);

		return tasty.start()
			.then(
				() => tasty.stop()
			)
			.then(() => {
				expect(spy1).to.not.have.been.called
				expect(spy2).to.not.have.been.called
			});
	});

	it('removes listeners', function() {
		const spy1 = chai.spy(),
			spy2 = chai.spy(),
			tasty = new Tasty();
		tasty.on('close', spy1);
		tasty.once('close', spy2);

		return tasty.start()
			.then(
				() => tasty.stop()
			)
			.then(() => {
				expect(spy1).to.have.been.called
				expect(spy2).to.have.been.called
			});
	});

	it('warns on invald exclude config', function() {
		const spy = chai.spy();
		new Tasty({
			exclude: [],
			console: {warn: spy}
		});
		expect(spy).to.have.been.called.with('invalid exclude pattern');
		expect(spy).to.have.been.called.with('no test files specified');
	});

	it('warns on invald include config', function() {
		const spy = chai.spy();
		new Tasty({
			include: [''],
			console: {warn: spy}
		});
		expect(spy).to.not.have.been.called.with('invalid exclude pattern');
		expect(spy).to.have.been.called.with('no test files found');
	});

	it('throws without URL', function() {
		expect(() => {
			new Tasty({
				url: false
			});
		}).to.throw(TypeError);
	});

	it('throws on unknown coverage toolchain', function() {
		expect(() => {
			new Tasty({
				coverage: 'big-kahuna-coverage'
			});
		}).to.throw(TypeError);
	});

	it('throws on unknown runner toolchain', function() {
		expect(() => {
			new Tasty({
				coverage: 'runner-royale'
			});
		}).to.throw(TypeError);
	});

	it('throws on wrong runner configration', function() {
		expect(() => {
			new Tasty({
				bail: true,
				runner: 'jasmine'
			});
		}).to.throw(TypeError);

		expect(() => {
			new Tasty({
				bail: true,
				runner: 'qunit'
			});
		}).to.throw(TypeError);
	});
});
