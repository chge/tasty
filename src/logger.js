export default Logger;

import { forEach, format, map } from './utils';

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
	constructor(tasty) {
		this.tasty = tasty;

		forEach(['debug', 'log', 'info', 'warn', 'error'], (name) => {
			this[name] = this.output.bind(this, name);
		});
	}

	output(name) {
		// eslint-disable-next-line no-console
		const api = window.console;
		if (!api) {
			return;
		}
		const config = this.tasty.config,
			stringify = config.logger ?
				config.logger.stringify :
				false,
			args = ['tasty'].concat(
				Array.prototype.slice.call(arguments, 1)
			);

		Function.prototype.apply.call(
			api[name],
			api,
			stringify ?
				[
					map(
						args,
						typeof stringify === 'function' ?
							stringify :
							serialize
					).join(' ')
				] :
				args
		);
	}
}

// TODO better.
function serialize(value) {
	return value instanceof Error ?
		value.toString() :
		format(value);
}
