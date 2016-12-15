'use strict';

module.exports = createTool;

const thing = require('./thing').thing,
	util = require('./util'),
	instance = util.instance;

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
 * @returns {Function}
 */
function add(id, box, server, path, handle) {
	path = path.split('.');
	let space = path[1] ? path[0] : null,
		name = path[1] || path[0],
		scope = space ?
			box[space] = box[space] || {} :
			box;

	return scope[name] = typeof handle === 'function' ?
		function() {
			try {
				return handle.apply(this, [].slice.call(arguments));
			} catch (thrown) {
				return Promise.reject(thrown);
			}
		} :
		function() {
			return server.send(
				box.id,
				'tool',
				[space ? space + '.' + name : name].concat(
					[].slice.call(arguments)
				)
			);
		}
}

function fill(id, box, server) {
	box.storage = {
		named: {},
		stack: []
	};

	const simpleTool = box;

	const complexTool = (name, handle) => {
		const helper = function helper() {
			const args = [].slice.call(arguments),
				promise = args.find(
					(item) => item instanceof Promise
				);
			if (promise) {
				const index = args.indexOf(promise);

				return promise.then(
					(value) => helper.apply(
						this,
						args.slice(0, index)
							.concat(
								value,
								args.slice(index + 1)
							)
					)
				);
			}

			try {
				return handle.apply(this, arguments)
					.catch(
						(error) => Promise.reject(
							error instanceof Error ?
								error :
								new Error(`${name} ${error}`)
						)
					);
			} catch (thrown) {
				throw thrown instanceof Error ?
					thrown :
					new TypeError(`${name} ${thrown}`);
			}
		};

		return box(name, helper);
	};

	const thingTool = (name, things, scopes) => {
		const handle = (what, scope, options) => {
			if (what instanceof Promise) {
				return what.then(
					(w) => handle(w, scope, options)
				);
			}
			if (scope instanceof Promise) {
				return scope.then(
					(s) => handle(what, s, options)
				);
			}
			if (!what) {
				throw new TypeError(`${name}, invalid thing`);
			}
			what = thing(what);
			scope = scope ?
				thing(scope) :
				thing('window', undefined);
			if (things) {
				if (things.indexOf(what.type) === -1 || things.indexOf('!' + what.type) !== -1) {
					throw new TypeError(`${name}, ${what.type} is not supported`);
				}
			}
			scopes = scopes ||
				['node', 'nodes', 'window'];
			if (scopes.indexOf(scope.type) === -1 || scopes.indexOf('!' + scope.type) !== -1) {
				throw new TypeError(`${name}, scope ${scope.type} is not supported`);
			}

			return tool(name, options ? [what, scope, options] : [what, scope]);
		};

		return box(name, handle);
	};

	const tool = (name, args) => server.send(id, 'tool', [name].concat(args || []));

	const exec = (code, args, persistent) => server.exec(id, code, args, persistent);

	/**
	 * Checks presence of given {@link #Thing|Thing}.
	 * @function is
	 * @param {Thing|String|RegExp} what Thing to check presence of. String or RegExp means {@link #text|text}.
	 * @param {Thing|String} [where=window] Thing to search in. String means {@link #nodes|nodes}.
	 * @param {Object|Boolean} [options] Search {@link /tasty/?api=client#search|options}.
	 * @see {@link #no|no}
	 * @throws {TypeError}
	 * @tool
	 * @example
is(text('Message sent'));
is(image('kitty.png'));
is(text('Other'), node('select.gender'));
is(text('Share'), nodes('.action'));
is('Save', 'input[type="submit"]');
is('', '.log.error');
	 */
	thingTool('is');

	/**
	 * Checks absence of given {@link #Thing|Thing}.
	 * @function no
	 * @param {Thing|String|RegExp} what Thing to check absence of. String or RegExp means {@link #text|text}.
	 * @param {Thing|String} [where=window] Thing to search in. String means {@link #nodes|nodes}.
	 * @param {Object|Boolean} [options] Search {@link /tasty/?api=client#search|options}.
	 * @see {@link #is|is}
	 * @throws {TypeError}
	 * @tool
	 * @example
no(text('Error occurred'));
no(image('unicorn.png'));
no(text('Prove you are a human'), node('form'));
no(text('&nbsp;'), nodes('p'));
no('Delete', '#create');
no('', '.description');
	 */
	thingTool('no');

	/**
	 * Stops client on breakpoint using `debugger` statement.
	 * There's no way to resume execution from Tasty, but this tool is useful for debugging.
	 * @function breakpoint
	 * @tool
	 */
	simpleTool('breakpoint');

	/**
	 * Clears focused field.
	 * @function clear
	 * @param {Number|Boolean} count Number of symbols to clear, `true` to clear all.
	 * @tool
	 */
	simpleTool('clear');

	/**
	 * Clicks given {@link #Thing|Thing}.
	 * @function click
	 * @param {Thing|String|RegExp} what Thing to click. String or RegExp means {@link #text|text}.
	 * @param {Thing|String} [where=window] Thing to search in. String means {@link #nodes|nodes}.
	 * @param {Object|Boolean} [options] Search {@link /tasty/?api=client#search|options}.
	 * @throws {TypeError}
	 * @tool
	 */
	thingTool('click', ['window', 'image', 'node', 'text', 'any']);

	/**
	 * Double-clicks given {@link #Thing|Thing}.
	 * @function dblclick
	 * @alias doubleclick
	 * @param {Thing|String|RegExp} what Thing to double-click.
	 * @param {Thing|String} [where=window] Thing to search in. String means {@link #nodes|nodes}.
	 * @param {Object|Boolean} [options] Search {@link /tasty/?api=client#search|options}.
	 * @throws {TypeError}
	 * @tool
	 */
	thingTool('dblclick', ['window', 'image', 'node', 'text']);

	/**
	 * Delays test execution.
	 * @function delay
	 * @param {Number} ms Number of milliseconds to wait.
	 * @tool
	 */
	complexTool('delay', (ms) => {
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
	 * @throws {TypeError}
	 * @tool
	 */
	complexTool('during', (tool, args, delay, timeout) => {
		const handle = tool ?
			tool.handle || tool :
			null;
		if (typeof handle !== 'function') {
			throw 'invalid tool ' + tool;
		}

		args = Array.isArray(args) ?
			args :
			[args];
		delay = (delay | 0) || 100;
		timeout = (timeout | 0) || 2000;

		return new Promise((resolve, reject) => {
			let repeatTimer;
			const timeoutTimer = setTimeout(
				() => {
					clearTimeout(repeatTimer);
					reject('during timeout ' + timeout + ' ms');
				},
				timeout
			);

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
	 * Executes given function on client side. Reference to {@link /tasty/?api=client/tasty|tasty} is available via closure.
	 * @function exec
	 * @param {Function} fn Function to call.
	 * @param {Array} [args=[]] List of arguments to call function with.
	 * @throws {TypeError}
	 * @tool
	 */
	complexTool('exec', function(fn, args) {
		if (typeof fn !== 'function') {
			throw 'invalid function ' + fn;
		}

		return exec(fn.toString(), args);
	});

	/**
	 * Gets named value from runner storage.
	 * @function get
	 * @param {String} name Name.
	 * @throws {TypeError}
	 * @tool
	 */
	complexTool('get', (name) => {
		if (!(name + '')) {
			throw 'invalid name ' + name;
		}
		const value = box.storage.named[name];

		return instance(value, Error) ?
			Promise.reject(value) :
			Promise.resolve(value);
	});

	/**
	 * Navigates client through history.
	 * @function history
	 * @param {Number} go Argument for `history.go` call.
	 * @throws {TypeError}
	 * @tool
	 */
	complexTool('history', (go) => {
		if (typeof go !== 'number') {
			throw 'invalid argument ' + go;
		}

		return tool('history', [go]);
	});

	/**
	 * Adds or removes hook.
	 * @function hook
	 * @param {Function} fn Function to call on client side.
	 * @param {Array} [args=[]] List of arguments to call `fn` with.
	 * @param {String[]} filter=[...] List of tools to call after.
	 * @param {Boolean} [persistent=false] Preserve hook upon navigation.
	 * @throws {TypeError}
	 * @tool
	 */
	complexTool('hook', (type, fn, args, filter, persistent) => {
		if (typeof type !== 'string') {
			throw 'invalid type ' + type;
		}
		if (typeof fn !== 'function') {
			throw 'invalid function ' + fn;
		}
		// TODO support '*', 'all', 'start', 'test', 'end';
		if (!Array.isArray(filter) || !filter.length) {
			throw 'invalid or empty filter';
		}

		return exec(
`function(args, filter) {
	var tasty = this.tasty || this.require('tasty');
	tasty.hook(
		tasty.map(filter, function(name) {
			return '${type}.' + name;
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
	});

	/**
	 * Hovers given {@link #Thing|Thing}.
	 * @function hover
	 * @param {Thing|String|RegExp} what Thing to hover.
	 * @param {Thing|String} [where=window] Thing to search in. String means {@link #nodes|nodes}.
	 * @param {Object|Boolean} [options] Search {@link /tasty/?api=client#search|options}.
	 * @throws {TypeError}
	 * @tool
	 */
	thingTool('hover', ['image', 'node', 'text']);

	/**
	 * Navigates client to given URL.
	 * @function navigate
	 * @param {String} url URL to navigate.
	 * @tool
	 */
	simpleTool('navigate');

	/**
	 * Pastes given text into focused field.
	 * @function paste
	 * @param {String} what Text to paste.
	 * @tool
	 */
	simpleTool('paste');

	/**
	 * Pops value from runner storage.
	 * @function pop
	 * @throws {TypeError}
	 * @tool
	 */
	complexTool('pop', () => {
		if (!box.storage.stack.length) {
			throw 'stack is empty';
		}
		const value = box.storage.stack.pop();

		return instance(value, Error) ?
			Promise.reject(value) :
			Promise.resolve(value);
	});

	/**
	 * Pushes value into runner storage.
	 * @function push
	 * @tool
	 */
	complexTool('push', (value) => {
		box.storage.stack.push(value);

		return Promise.resolve();
	});

	/**
	 * (Re)sets client ready method.
	 * @function ready
	 * @param {String} method Ready method: `delay`, `document`, `exec`, `until`, `window`.
	 * @param {Number|Function} [value] Method value.
	 * @param {String[]} [filter=[...]] List of tools to perform ready checks after.
	 * @param {Boolean} [persistent=true] Preserve upon navigation.
	 * @throws {TypeError}
	 * @tool
	 */
	complexTool('ready', (method, value, filter, persistent) => {
		filter = Array.isArray(filter) ?
			filter :
			filter ?
				[filter] :
				[
					'click',
					'dblclick',
					'paste',
					'reconnect', // NOTE instead of history, navigate and reload.
					'type'
				];
		persistent = persistent !== false;

		switch (method) {
			case 'delay':
				return exec(
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
				return exec(
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
							tasty.dom.on(document, 'DOMContentLoaded', resolve);
							tasty.dom.on(document, 'readystatechage', function() {
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
				return exec(
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
				return exec(
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
				return exec(
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
						tasty.dom.on(window, 'load', resolve);
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
				throw 'unknown ready method ' + method;
		}
	});

	/**
	 * Reloads client document.
	 * @function reload
	 * @tool
	 */
	simpleTool('reload');

	/**
	 * Resets client state.
	 * @function reset
	 * @param {String} [url] URL to navigate.
	 * @param {Boolean} [persistent=false] Clear persistent hooks.
	 * @tool
	 */
	complexTool('reset', (url, persistent) => {
		persistent !== false &&
			server.deleteScripts(id);

		return tool('reset', [url]);
	});

	/**
	 * (Re)sets named value in runner storage.
	 * @function set
	 * @param {String} name Name.
	 * @param {*} value Value.
	 * @throws {TypeError}
	 * @tool
	 */
	complexTool('set', (name, value) => {
		if (!(name + '')) {
			throw 'invalid name ' + name;
		}

		box.storage.named[name] = value;

		return Promise.resolve();
	});

	/**
	 * Types given text into focused field.
	 * @function type
	 * @param {String} what Text to type.
	 * @tool
	 */
	complexTool('type', (what) => {
		return tool('type', [what + '']);
	});

	/**
	 * Repeatedly executes `tool` with `args` and `delay`. Ignores fails, stops on first success or after `timeout`.
	 * @function until
	 * @param {Function} tool Tool or function to call on server side.
	 * @param {Array} [args=[]] List of arguments to call `tool` with.
	 * @param {Number} [delay=100] Delay in milliseconds between tries.
	 * @param {Number} [timeout=2000] Timeout in milliseconds.
	 * @throws {TypeError}
	 * @tool
	 */
	complexTool('until', (tool, args, delay, timeout) => {
		const handle = tool ?
			tool.handle || tool :
			null;
		if (typeof handle !== 'function') {
			throw 'invalid tool ' + tool;
		}

		args = Array.isArray(args) ?
			args :
			[args];
		delay = (delay | 0) || 100;
		timeout = (timeout | 0) || 2000;

		return new Promise((resolve, reject) => {
			let repeatTimer;
			const timeoutTimer = setTimeout(
				() => {
					clearTimeout(repeatTimer);
					reject('until timeout ' + timeout + ' ms');
				},
				timeout
			);

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

	return box;
}
