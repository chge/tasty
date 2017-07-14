'use strict';

/**
 * Base class for Tasty coverage toolchain.
 * @example
const Tasty = require('tasty');


class MyCoverage extends Tasty.Coverage {
	constructor(tasty) {
		super(tasty);
		...
	}

	instrument(code, name) {
		...
	}

	collect(data) {
		...
	}

	report() {
		...
	}
}


const tasty = new Tasty({
	coverage: MyCoverage,
	...
});
 */
class Coverage {
	/**
	 * @param {Tasty} tasty {@link #Tasty|Tasty} instance.
	 */
	constructor(tasty) {
		if (!this) {
			return new Coverage(tasty);
		}
	}

	/**
	 * Instruments given JavaScript code.
	 * @param {string} code JavaScript code.
	 * @param {string} name File name.
	 * @returns {Promise}
	 */
	instrument() {
		return Promise.reject(
			new Error(this.constructor.name + '.instrument is not implemented')
		);
	}

	/**
	 * Collects coverage info from given data.
	 * @param {Object} data Coverage data.
	 * @returns {Promise}
	 */
	collect() {
		return Promise.reject(
			new Error(this.constructor.name + '.collect is not implemented')
		);
	}

	/**
	 * Reports coverage.
	 * @returns {Promise}
	 */
	report() {
		return Promise.reject(
			new Error(this.constructor.name + '.report is not implemented')
		);
	}
}

module.exports = Coverage;
