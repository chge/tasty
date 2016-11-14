'use strict';

module.exports = createTool;

const util = require('./util');

function createTool(id, server, config) {
	const box = function tool() {
		return box.add.apply(null, arguments);
	};
	box.add = add.bind(null, id, box, server);
	// TODO readonly?
	box.id = id;

	return fill(id, box, server, config);
}

/**
 * @function tool
 * @param {String} path
 * @param {Function} handle
 * @return {Function}
 */
function add(id, box, server, path, handle) {
	path = path.split('.');
	let space = path[1] ? path[0] : null,
		name = path[1] || path[0],
		scope = space ?
			box[space] = box[space] || {} :
			box;

	return scope[name] = typeof handle === 'function' ?
		handle :
		function() {
			return server.send(
				box.id,
				'tool',
				[space + '.' + name].concat(
					util.serialize(
						[].slice.call(arguments)
					)
				)
			);
		}
}

function fill(id, tool, server) {
	tool.storage = {
		named: {},
		stack: []
	};

	/**
	 * Tools related to current client.
	 * @namespace client
	 */

	/**
	 * Client flaws.
	 * @memberof client
	 * @member {Object} flaws
	 * @see {@link /api/client/tasty.flaws|tasty.flaws|client flaws}
	 */

	/**
	 * Set after-hook.
	 * @function after
	 * @memberof client
	 * @param {Function} fn Function to call on client side.
	 * @param {Array} [args] List of arguments to call `fn` with.
	 * @param {String[]} [filter] List of tools to call after.
	 * @param {Boolean} [persistent] Preserve hook upon navigation.
	 */
	tool('client.after', (fn, args, filter, persistent) =>
		registerHook(id, server, 'after.', fn, args, filter, persistent)
	);

	/**
	 * Set before-hook.
	 * @function before
	 * @memberof client
	 * @param {Function} fn Function to call on client side.
	 * @param {Array} [args] List of arguments to call `fn` with.
	 * @param {String[]} [filter] List of tools to call before.
	 * @param {Boolean} [persistent] Preserve hook upon navigation.
	 */
	tool('client.before', (fn, args, filter, persistent) =>
		registerHook(id, server, 'before.', fn, args, filter, persistent)
	);

	/**
	 * Stop client on breakpoint using `debugger` directive.
	 * @function breakpoint
	 * @memberof client
	 */
	tool('client.breakpoint');

	/**
	 * Execute given function on client side. The {@link /api/client/tasty|`tasty`} is available via closure.
	 * @function exec
	 * @memberof client
	 * @param {Function} fn Function to call.
	 * @param {Array} [args] List of arguments to call function with.
	 */
	tool('client.exec', function(fn, args) {
		return server.exec(id, fn.toString(), args);
	});

	/**
	 * Navigate client through history.
	 * @function go
	 * @memberof client
	 * @param {Number} relative Argument for `history.go` call.
	 */
	tool('client.go');

	/**
	 * Check client location.
	 * @function location
	 * @memberof client
	 * @param {String|RegExp} url Expected URL.
	 */
	tool('client.location');

	/**
	 * Navigate client to given URL.
	 * @function navigate
	 * @memberof client
	 * @param {String} url URL to navigate.
	 */
	tool('client.navigate');

	/**
	 * Persistent version of {@link #page.ready}, preserved upon navigation.
	 * @function ready
	 * @memberof client
	 * @param {String} method Ready method: `delay`, `document`, `exec`, `until`, `window`.
	 * @param {Number|Function} [value] Method value.
	 * @param {String[]} [filter] List of tools to perform ready checks after.
	 */
	tool('client.ready', (method, value, filter) =>
		registerReady(id, server, true, method, value, filter)
	);

	/**
	 * Reload client document.
	 * @function reload
	 * @memberof client
	 */
	tool('client.reload');

	/**
	 * Reset client state.
	 * @function reset
	 * @memberof client
	 * @param {String} [url] URL to navigate.
	 * @param {Boolean} [persistent=false] Clear persistent hooks.
	 */
	tool('client.reset', (url, persistent) => {
		persistent !== false &&
			server.deleteScripts(id);

		return server.send(id, 'tool', ['client.reset', url]);
	});

	/**
	 * Tools for user input.
	 * @namespace input
	 */

	/**
	 * Clear focused field.
	 * @function clear
	 * @memberof input
	 * @param {Number|Boolean} count Number of symbols to clear, `true` to clear all.
	 */
	tool('input.clear');

	/**
	 * Click text.
	 * @function click
	 * @memberof input
	 * @param {String|RegExp} what Text to click.
	 * @param {String} [selector] Selector to start search with.
	 * @param {Boolean} [strict] Strict flag: `true` for exact match, `false` for loose search and `undefined` for default behavior.
	 */
	tool('input.click');

	/**
	 * Double-click text.
	 * @function dblclick
	 * @memberof input
	 * @param {String|RegExp} what Text to double-click.
	 * @param {String} [selector] Selector to start search with.
	 * @param {Boolean} [strict] Strict flag: `true` for exact match, `false` for loose search and `undefined` for default behavior.
	 */
	tool('input.dblclick');

	/**
	 * Hover text.
	 * @function hover
	 * @memberof input
	 * @param {String|RegExp} what Text to hover.
	 * @param {String} [selector] Selector to start search with.
	 * @param {Boolean} [strict] Strict flag: `true` for exact match, `false` for loose search and `undefined` for default behavior.
	 */
	tool('input.hover');

	/**
	 * Paste given text into focused field.
	 * @function paste
	 * @memberof input
	 * @param {String} what Text to paste.
	 */
	tool('input.paste');

	/**
	 * Type given text into focused field.
	 * @function type
	 * @memberof input
	 * @param {String} what Text to type.
	 */
	tool('input.type');

	/**
	 * Tools related to current page.
	 * @namespace page
	 */

	/**
	 * Check if given fount is loaded.
	 * @function font
	 * @memberof page
	 * @param {String} family Font family to check.
	 * @param {String} [selector]
	 */
	tool('page.font');

	/**
	 * Check if given resource is loaded.
	 * @function loaded
	 * @memberof page
	 * @param {String|RegExp} what URL to search.
	 */
	tool('page.loaded');

	/**
	 * Set ready method.
	 * @function ready
	 * @memberof page
	 * @param {String} method Ready method: `delay`, `document`, `exec`, `until`, `window`.
	 * @param {Number|Function} [value] Method value.
	 * @param {String[]} [filter] List of tools to perform ready checks after.
	 */
	tool('page.ready', (method, value, filter) =>
		registerReady(id, server, false, method, value, filter)
	);

	/**
	 * Check presence of given text.
	 * @function text
	 * @memberof page
	 * @param {String|RegExp} what Text to search.
	 * @param {String} [selector] Selector to start search with.
	 * @param {Boolean} [strict] Strict flag: `true` for exact match, `false` for loose search and `undefined` for default behavior.
	 */
	tool('page.text');

	/**
	 * Check page title.
	 * @function title
	 * @memberof page
	 * @param {String|RegExp} what Expected title.
	 */
	tool('page.title');

	/**
	 * Tools related to test runner.
	 * @namespace runner
	 */

	/**
	 * Delay test execution.
	 * @function delay
	 * @memberof runner
	 * @param {Number} ms Number of milliseconds to wait.
	 */
	tool('runner.delay', (ms) => {
		return new Promise((resolve) => {
			setTimeout(resolve, ms | 0);
		});
	});

	/**
	 * Get named value from runner storage.
	 * @function get
	 * @memberof runner
	 * @param {String} name Name.
	 */
	tool('runner.get', (name) => {
		if (!(name + '')) {
			throw new TypeError('runner.get invalid name');
		}
		const value = tool.storage.named[name];

		return value instanceof Error ?
			Promise.reject(value) :
			Promise.resolve(value);
	});

	/**
	 * Pop value from runner storage.
	 * @function pop
	 * @memberof runner
	 */
	tool('runner.pop', () => {
		if (!tool.storage.stack.length) {
			throw new TypeError('runner.pop stack is empty');
		}
		const value = tool.storage.stack.pop();

		return value instanceof Error ?
			Promise.reject(value) :
			Promise.resolve(value);
	});

	/**
	 * Push value into runner storage.
	 * @function push
	 * @memberof runner
	 * @param {*} value Value.
	 */
	tool('runner.push', (value) => {
		tool.storage.stack.push(value);
	});

	/**
	 * (Re)set named valie in runner storage.
	 * @function set
	 * @memberof runner
	 * @param {String} name Name.
	 * @param {*} value Value.
	 */
	tool('runner.set', (name, value) => {
		if (!(name + '')) {
			throw new TypeError('runner.set invalid name');
		}
		tool.storage.named[name] = value;
	});

	/**
	 * Repeatedly execute `tool` with `args` and `delay`. Stop when it will succeed or `timeout` will be reached.
	 * @function until
	 * @memberof runner
	 * @param {Function} tool Tool or function to call on server side.
	 * @param {Array} [args] List of arguments to call `tool` with.
	 * @param {Number} [delay=100] Delay in milliseconds between tries.
	 * @param {Number} [timeout=2000] Timeout in milliseconds.
	 */
	tool('runner.until', (tool, args, delay, timeout) => {
		const handle = tool ?
			tool.handle || tool :
			null;
		args = Array.isArray(args) ?
			args :
			[args];
		delay = (delay | 0) || 100;
		timeout = (timeout | 0) || 2000;

		return new Promise((resolve, reject) => {
			if (typeof handle !== 'function') {
				return reject(
					new TypeError('invalid tool', tool)
				);
			}

			let repeatTimer;
			const timeoutTimer = setTimeout(() => {
				clearTimeout(repeatTimer);
				reject(
					new Error('runner.until timeout ' + timeout + ' ms')
				)
			}, timeout);

			const repeat = () => {
				handle.apply(null, args)
					.then(
						(result) => {
							clearTimeout(timeoutTimer);
							resolve(result);
						},
						() => {
							repeatTimer = setTimeout(repeat, delay);
						}
					)
			};

			repeat();
		});
	});

	/**
	 * Repeatedly execute `tool` with `args` and `delay`. Stop when it will fail or `timeout` will be reached.
	 * @function while
	 * @memberof runner
	 * @param {Function} tool
	 * @param {Array} [args]
	 * @param {Number} [delay=100]
	 * @param {Number} [timeout=2000]
	 */
	tool('runner.while', (tool, args, delay, timeout) => {
		const handle = tool ?
			tool.handle || tool :
			null;
		args = Array.isArray(args) ?
			args :
			[args];
		delay = (delay | 0) || 100;
		timeout = (timeout | 0) || 2000;

		return new Promise((resolve, reject) => {
			if (typeof handle !== 'function') {
				return reject(
					new TypeError('invalid tool', tool)
				);
			}

			let repeatTimer;
			const timeoutTimer = setTimeout(() => {
				clearTimeout(repeatTimer);
				reject(
					new Error('runner.while timeout ' + timeout + ' ms')
				)
			}, timeout);

			const repeat = () => {
				let result;
				handle.apply(null, args)
					.then(
						(res) => {
							result = res;
							repeatTimer = setTimeout(repeat, delay);
						},
						() => {
							clearTimeout(timeoutTimer);
							resolve(result);
						}
					)
			};

			repeat();
		});
	});

	return tool;
}

function registerHook(id, server, prefix, fn, args, filter, persistent) {
	// TODO support '*', 'all', 'start', 'test', 'end';
	if (!Array.isArray(filter) || !filter.length) {
		throw new TypeError('invalid filter');
	}

	return server.exec(
		id,
`function(args, filter) {
	var tasty = this.tasty || this.require('tasty');
	tasty.hook(
		tasty.map(filter, function(name) {
			return '${prefix}' + name;
		}),
		function(result) {
			return tasty.thenable(
				(${fn.toString()}).apply(this, args)
			).then(function() {
				return result;
			});
		},
		'exec'
	);
}`,
		[args, filter],
		persistent
	);
}

function registerReady(id, server, persistent, method, value, filter) {
	filter = Array.isArray(filter) ?
		filter :
		filter ?
			[filter] :
			[
				'reconnect', // NOTE instead of client.navigate and client.reload.
				'input.click',
				'input.paste',
				'input.type'
			];

	switch (method) {
		case 'delay':
			return server.exec(
				id,
`function ready(method, value, filter) {
	var tasty = this.tasty || this.require('tasty');
	tasty.hook(
		tasty.map(filter, function(name) {
			return 'after.' + name;
		}),
		function delay(result) {
			return tasty.delay(value, result);
		},
		'delay ' + value
	);
}`,
				[method, value | 0, filter],
				persistent
			);
		case 'document':
			return server.exec(
				id,
`function(method, value, filter) {
	var tasty = this.tasty || this.require('tasty');
	tasty.hook(
		tasty.map(filter, function(name) {
			return 'after.' + name;
		}),
		function(result) {
			return tasty.thenable(
				document.readyState === 'interactive' ||
					document.readyState === 'complete' ?
						result :
						function(resolve) {
							document.addEventListener('DOMContentLoaded', resolve);
							document.addEventListener('readystatechage', function() {
								(document.readyState === 'interactive' ||
									document.readyState === 'complete') &&
										resolve();
							});
						}
			).then(function() {
				return value ?
					tasty.delay(value, result) :
					result;
			});
		},
		value ?
			'document ' + value :
			'document'
	);
}`,
				[method, value | 0, filter],
				persistent
			);
		case 'exec':
			return server.exec(
				id,
`function(filter) {
	var tasty = this.tasty || this.require('tasty');
	tasty.hook(
		tasty.map(filter, function(name) {
			return 'after.' + name;
		}),
		function(result) {
			return tasty.thenable(
				(${value.toString()}).call(this, tasty)
			).then(function() {
				return result;
			});
		},
		'exec'
	);
}`,
				[filter],
				persistent
			);
		case 'until':
			// TODO configurable period.
			return server.exec(
				id,
				// TODO use setTimeout();
`function(filter, period) {
	var tasty = this.tasty || this.require('tasty');
	tasty.hook(
		tasty.map(filter, function(name) {
			return 'after.' + name;
		}),
		function(result) {
			return tasty.thenable(function(resolve) {
				var interval = setInterval(function() {
					if ((${value.toString()}).call(this, tasty)) {
						clearInterval(interval);
						resolve(result);
					}
				}, period);
			});
		},
		'until ' + period
	);
}`,
				[filter, 100],
				persistent
			);
		case 'window':
			return server.exec(
				id,
`function(method, value, filter) {
	var tasty = this.tasty || this.require('tasty');
	tasty.hook(
		tasty.map(filter, function(name) {
			return 'after.' + name;
		}),
		function(result) {
			return tasty.thenable(
				document.readyState === 'complete' ?
					result :
					function(resolve) {
						window.addEventListener('load', resolve);
					}
			).then(function() {
				return value ?
					tasty.delay(value, result) :
					result;
			});
		},
		value ?
			'window ' + value :
			'window'
	);
}`,
				[method, value | 0, filter],
				persistent
			);
		default:
			// TODO allow client to implement?
			return Promise.reject(
				new TypeError(`unknown ready method '${method}'`)
			);
	}
}
