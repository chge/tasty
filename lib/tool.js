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
	 * Stops client on breakpoint using `debugger` directive.
	 * There's no way to resume execution from Tasty.
	 * @function breakpoint
	 */
	tool('breakpoint');

	/**
	 * Clears focused field.
	 * @function clear
	 * @param {Number|Boolean} count Number of symbols to clear, `true` to clear all.
	 */
	tool('clear');

	/**
	 * Clicks on text.
	 * @function click
	 * @param {String|RegExp} what Text to click.
	 * @param {String} [selector] Selector to start search with.
	 * @param {Boolean} [strict] Strict flag: `true` for exact match, `false` for loose search and `undefined` for default behavior.
	 */
	tool('click');

	/**
	 * Double-clicks on text.
	 * @function dblclick
	 * @param {String|RegExp} what Text to double-click.
	 * @param {String} [selector] Selector to start search with.
	 * @param {Boolean} [strict] Strict flag: `true` for exact match, `false` for loose search and `undefined` for default behavior.
	 */
	tool('dblclick');

	/**
	 * Delays test execution.
	 * @function delay
	 * @param {Number} ms Number of milliseconds to wait.
	 */
	tool('delay', (ms) => {
		return new Promise((resolve) => {
			setTimeout(resolve, ms | 0);
		});
	});

	/**
	 * Repeatedly executes `tool` with `args` and `delay`. Stops on first fail or after `timeout`. Fail is ignored.
	 * @function during
	 * @param {Function} tool
	 * @param {Array} [args=[]]
	 * @param {Number} [delay=100]
	 * @param {Number} [timeout=2000]
	 */
	tool('during', (tool, args, delay, timeout) => {
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

	/**
	 * Executes given function on client side. The {@link /tasty/?api=client/tasty|`tasty`} is available via closure.
	 * @function exec
	 * @param {Function} fn Function to call.
	 * @param {Array} [args=[]] List of arguments to call function with.
	 */
	tool('exec', function(fn, args) {
		return server.exec(id, fn.toString(), args);
	});

	/**
	 * Checks if given font is loaded.
	 * @function font
	 * @param {String} family Font family to check.
	 * @param {String} [selector]
	 */
	tool('font');

	/**
	 * Gets named value from runner storage.
	 * @function get
	 * @param {String} name Name.
	 */
	tool('get', (name) => {
		if (!(name + '')) {
			throw new TypeError('get invalid name');
		}
		const value = tool.storage.named[name];

		return value instanceof Error ?
			Promise.reject(value) :
			Promise.resolve(value);
	});

	/**
	 * Navigates client through history.
	 * @function history
	 * @param {Number} go Argument for `history.go` call.
	 */
	tool('history');

	/**
	 * Adds or removes hook.
	 * @function hook
	 * @param {Function} fn Function to call on client side.
	 * @param {Array} [args=[]] List of arguments to call `fn` with.
	 * @param {String[]} [filter=[...]] List of tools to call after.
	 * @param {Boolean} [persistent=false] Preserve hook upon navigation.
	 */
	tool('hook', (type, fn, args, filter, persistent) =>
		registerHook(id, server, type, fn, args, filter, persistent)
	);

	/**
	 * Hovers text.
	 * @function hover
	 * @param {String|RegExp} what Text to hover.
	 * @param {String} [selector] Selector to start search with.
	 * @param {Boolean} [strict] Strict flag: `true` for exact match, `false` for loose search and `undefined` for default behavior.
	 */
	tool('hover');

	/**
	 * Checks if given resource is loaded.
	 * @function loaded
	 * @param {String|RegExp} what URL to search.
	 */
	tool('loaded');

	/**
	 * Checks client location.
	 * @function location
	 * @param {String|RegExp} url Expected URL.
	 */
	tool('location');

	/**
	 * Navigates client to given URL.
	 * @function navigate
	 * @param {String} url URL to navigate.
	 */
	tool('navigate');

	/**
	 * Pastes given text into focused field.
	 * @function paste
	 * @param {String} what Text to paste.
	 */
	tool('paste');

	/**
	 * Pops value from runner storage.
	 * @function pop
	 */
	tool('pop', () => {
		if (!tool.storage.stack.length) {
			throw new TypeError('runner.pop stack is empty');
		}
		const value = tool.storage.stack.pop();

		return value instanceof Error ?
			Promise.reject(value) :
			Promise.resolve(value);
	});

	/**
	 * Pushes value into runner storage.
	 * @function push
	 * @param {*} value Value.
	 */
	tool('push', (value) => {
		tool.storage.stack.push(value);
	});

	/**
	 * (Re)sets client ready method.
	 * @function ready
	 * @param {String} method Ready method: `delay`, `document`, `exec`, `until`, `window`.
	 * @param {Number|Function} [value] Method value.
	 * @param {String[]} [filter=[...]] List of tools to perform ready checks after.
	 * @param {Boolean} [persistent=true] Preserve upon navigation.
	 */
	tool('ready', (method, value, filter, persistent) =>
		registerReady(id, server, method, value, filter, persistent)
	);

	/**
	 * Reloads client document.
	 * @function reload
	 */
	tool('reload');

	/**
	 * Resets client state.
	 * @function reset
	 * @param {String} [url] URL to navigate.
	 * @param {Boolean} [persistent=false] Clear persistent hooks.
	 */
	tool('reset', (url, persistent) => {
		persistent !== false &&
			server.deleteScripts(id);

		return server.send(id, 'tool', ['client.reset', url]);
	});

	/**
	 * (Re)sets named value in runner storage.
	 * @function set
	 * @param {String} name Name.
	 * @param {*} value Value.
	 */
	tool('set', (name, value) => {
		if (!(name + '')) {
			throw new TypeError('runner.set invalid name');
		}
		tool.storage.named[name] = value;
	});

	/**
	 * Checks presence of given text.
	 * @function text
	 * @param {String|RegExp} what Text to search.
	 * @param {String} [selector] Selector to start search with.
	 * @param {Boolean} [strict] Strict flag: `true` for exact match, `false` for loose search and `undefined` for default behavior.
	 */
	tool('text');

	/**
	 * Checks page title.
	 * @function title
	 * @param {String|RegExp} what Expected title.
	 */
	tool('title');

	/**
	 * Types given text into focused field.
	 * @function type
	 * @param {String} what Text to type.
	 */
	tool('type');

	/**
	 * Repeatedly executes `tool` with `args` and `delay`. Ignores fails, stops on first success or after `timeout`.
	 * @function until
	 * @param {Function} tool Tool or function to call on server side.
	 * @param {Array} [args=[]] List of arguments to call `tool` with.
	 * @param {Number} [delay=100] Delay in milliseconds between tries.
	 * @param {Number} [timeout=2000] Timeout in milliseconds.
	 */
	tool('until', (tool, args, delay, timeout) => {
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
					new Error('until timeout ' + timeout + ' ms')
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
			return '${prefix}.' + name;
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

function registerReady(id, server, method, value, filter, persistent) {
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
