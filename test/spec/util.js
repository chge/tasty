'use strict';

const chai = require('chai'),
	expect = chai.expect,
	util = require('../../lib/util');

describe('util.resolve', function() {
	it('resolves locally installed module', function() {
		expect(util.resolve('chai'))
			.not.to.throw;
	});

	it('resolves globally installed module', function() {
		expect(util.resolve('npm'))
			.not.to.throw;
	});

	it.skip('resolves module installed in CWD');

	it('throws on unresolved module', function() {
		const name = 'this-is-a-tasty-burger';
		expect(() => util.resolve(name))
			.to.throw(Error)
			.and.to.have.property('message').that.includes(name);
	});
});
