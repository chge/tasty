export default Tools;

import { deserialize, reason, thenable } from './utils';

import breakpoint from './tools/breakpoint';
import clear from './tools/clear';
import click from './tools/click';
import dblclick from './tools/dblclick';
import find from './tools/find';
import history from './tools/history';
import hover from './tools/hover';
import is from './tools/is';
import navigate from './tools/navigate';
import no from './tools/no';
import paste from './tools/paste';
import ready from './tools/ready';
import reload from './tools/reload';
import reset from './tools/reset';
import type from './tools/type';

/**
 * All client tools.
 * @member {Tools} Tasty#tools
 * @see {@link #Tools|Tools}
 * @example
exec(
	function(...) {
		this.tools.use('toolName', [...]); // returns Promise
		this.tools.all.toolName(...); // returns result, throws Error
	},
	[...]
);
 */

/**
 * Helper class.
 * @see {@link #Tasty#tools|Tasty#tools}
 */
class Tools {
	/**
	 * @param {Tasty} tasty {@link #Tasty|Tasty} instance.
	 */
	constructor(tasty) {
		this.tasty = tasty;

		/**
		 * All tools.
		 * @member {Object} Tools#all
		 * @protected
		 */
		this.all = {};

		// NOTE Rollup could change function name.
		this.add('breakpoint', breakpoint);
		this.add('clear', clear);
		this.add('click', click);
		this.add('dblclick', dblclick);
		this.add('find', find);
		this.add('history', history);
		this.add('hover', hover);
		this.add('is', is);
		this.add('navigate', navigate);
		this.add('no', no);
		this.add('paste', paste);
		this.add('ready', ready);
		this.add('reload', reload);
		this.add('reset', reset);
		this.add('type', type);
	}

	/**
	 * Adds tool.
	 * @param {string} name Tool name.
	 * @param {Function} handle Tool handle.
	 * @returns {Function} `handle`
	 */
	add(name, handle) {
		if (typeof name === 'function') {
			handle = name;
			name = handle.name;
		}
		if (!name) {
			throw reason('invalid tool name');
		}
		if (typeof handle !== 'function') {
			throw reason('invalid tool', handle);
		}

		return this.all[name] = handle;
	}

	/**
	 * Runs previously added tool.
	 * @param {string} name Tool name.
	 * @param {array} args Tool arguments.
	 * @returns {Promise}
	 */
	use(name, args) {
		args = deserialize(args);
		const tasty = this.tasty,
			hooks = tasty.hooks,
			logger = tasty.logger;

		logger.log.apply(logger, ['tool', name].concat(args));

		return thenable()
			.then((result) => hooks.run(result, 'before.' + name, args))
			.then(() => {
				const tool = this.all[name];
				if (tool) {
					return tool.apply(tasty, args);
				} else {
					throw reason('no such tool', name);
				}
			})
			.then((result) => hooks.run(result, 'after.' + name, args));
	}
}
