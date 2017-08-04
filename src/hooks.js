export default Hooks;

import { forEach, isArray, keys, thenable } from './utils';

/**
 * Hooks helper.
 * @member {Hooks} Tasty#hooks
 * @see {@link #Hooks|Hooks}
 */

/**
 * Helper class.
 * @see {@link #Tasty#hooks|Tasty#hooks}
 */
class Hooks {
	/**
	 * @param {Tasty} tasty {@link #Tasty|Tasty} instance.
	 */
	constructor(tasty) {
		this.hooks = {};
		this.tasty = tasty;
	}

	/**
	 * (Re)sets hook(s).
	 * @param {string[]} filter Hook keys.
	 * @param {Function} hook Hook function.
	 * @param {Tasty} hook.tasty {@link #Tasty|Tasty} instance.
	 * @param {*} hook.result Previous hook result.
	 * @param {string} hook.key Hook key.
	 * @param {array} hook.args Hook arguments.
	 * @param {string} [title]
	 */
	set(filter, hook, title) {
		filter = isArray(filter) ?
			filter :
			[filter];
		filter = filter[0] === '*' ?
			keys(this.hooks) :
			filter;

		// NOTE protect current hook chain from changes.
		this.update = hook === null ?
			() => {
				delete this.update;
				forEach(filter, (key) => {
					delete this.hooks[key];
				});
			} :
			() => {
				delete this.update;
				hook.title = title;
				forEach(filter, (key) => {
					this.hooks[key] = hook;
				});
			};

		return hook;
	}

	/**
	 * Runs previously set hook.
	 * @param {*} [result] Previous hook result.
	 * @param {string} key Hook key.
	 * @param {array} args Hook arguments.
	 * @returns {Promise}
	 */
	use(result, key, args) {
		const hook = this.hooks[key],
			tasty = this.tasty;
		if (hook) {
			const debug = tasty.logger.debug;
			if (hook.skip) {
				debug('hook', key, 'skip');

				delete hook.skip;
			} else {
				debug('hook', key, hook.title || '(anonymous)', hook.once ? 'once' : '');

				if (hook.once) {
					delete this.hooks[key];
				}
				result = hook.call(tasty, result, key, args);
			}
		}

		return thenable(result);
	}
}
