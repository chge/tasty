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
		if (typeof console === 'undefined') {
			this.debug = this.log = this.info = this.warn = this.error = function() {};
		} else {
			this.debug = wrap(console, 'debug', 'log');
			this.log = wrap(console, 'log', 'log');
			this.info = wrap(console, 'info', 'log');
			this.warn = wrap(console, 'warn', 'log');
			this.error = wrap(console, 'error', 'log');
		}
	}
}

function wrap(api, name, fallback) {
	name = api[name] ? name : fallback;

	// WORKAROUND: IE8 doesn't log spaces between arguments.
	if (window.attachEvent) {
		return function() {
			const fixed = ['tasty'];
			forEach(
				arguments,
				(arg) => fixed.push(' ', arg)
			);

			return Function.prototype.apply.call(
				api[name],
				api,
				fixed
			);
		};
	}

	// NOTE don't use bind();
	return function() {
		return Function.prototype.apply.call(
			api[name],
			api,
			['tasty'].concat(
				Array.prototype.slice.call(arguments)
			)
		);
	};
}
