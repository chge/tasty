'use strict';

const util = require('../util');

/**
 * Base class for Tasty test runners.
 * @example
const Tasty = require('tasty');


class MyRunner extends Tasty.Runner {
	constructor(tasty, client) {
		super(tasty, client);
		...
	}

	run() {
		...
		this.onTest('...');
		...
		this.onPass('...');
		...
		this.onFail('...', new Error('...'));
		...
		return new Promise(...);
	}
}


const tasty = new Tasty({
	runner: MyRunner,
	...
});
 */
class Runner {
	/**
	 * @member {Context} context Context for runner sandbox.
	 * @memberof Runner.prototype
	 * @readonly
	 */

	/**
	 * @member {string[]} files Array of globs for test files.
	 * @memberof Runner.prototype
	 * @readonly
	 */

	/**
	 * @param {Tasty} tasty {@link #Tasty|Tasty} instance.
	 * @param {Object} client Client instance.
	 */
	constructor(tasty, client) {
		if (!this) {
			return new Runner(tasty, client);
		}

		const config = tasty.config,
			id = client.id,
			logger = tasty.logger;
		logger.log('tasty', 'client', id, 'runner', config.runner);
		config.slow &&
			logger.log('tasty', 'client', id, 'slow', config.slow, 'ms');

		this.context = new tasty.Context(tasty, client);

		this.files = util.glob(config.include, config.exclude);
		this.files.length ?
			logger.log('tasty', 'test files', this.files) :
			logger.warn('tasty', 'no test files found');
	}

	/**
	 * Runs tests on attached client.
	 * @returns {Promise}
	 */
	run() {
		return Promise.reject(
			new Error(this.constructor.name + '.run is not implemented')
		);
	}

	/**
	 * Template method, should be called before each test.
	 * @template
	 * @param {string} name Test name.
	 */
	onTest() {
		throw new Error(this.constructor.name + '.onTest is not overridden')
	}

	/**
	 * Template method, should be called after each passed test.
	 * @template
	 * @param {string} name Test name.
	 */
	onPass() {
		throw new Error(this.constructor.name + '.onPass is not overridden')
	}

	/**
	 * Template method, should be called after each failed test.
	 * @template
	 * @param {string} name Test name.
	 * @param {Error} error Error.
	 */
	onFail() {
		throw new Error(this.constructor.name + '.onFail is not overridden')
	}
}

module.exports = Runner;
