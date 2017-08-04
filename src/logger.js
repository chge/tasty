export default  Logger;

import { forEach } from './utils';

/**
 * Logger.
 * @member {Logger} Tasty#logger
 * @see {@link #Logger|Logger}
 */

/**
 * Console-style logger.
 * @see {@link #Tasty#logger|Tasty#logger}
 */
class Logger {
	/**
	 * @param {Tasty} tasty {@link #Tasty|Tasty} instance.
	 */
	constructor() {
		this.debug = wrap(console, 'debug');
		this.log = wrap(console, 'log');
		this.info = wrap(console, 'info');
		this.warn = wrap(console, 'warn');
		this.error = wrap(console, 'error');
	}
}

function wrap(object, name) {
	// WORKAROUND: IE8 doesn't log spaces between arguments.
	if (window.attachEvent) {
		return (...args) => {
			const fixed = ['tasty'];
			forEach(
				args,
				(arg) => fixed.push(' ', arg)
			);
			args = fixed;

			Function.prototype.apply.call(object[name], object, args);
		};
	}

	return Function.prototype.bind.call(object[name], object, 'tasty');
}
