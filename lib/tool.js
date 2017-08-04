'use strict';

module.exports = Tool;

const debug = require('debug')('tasty:tool'),
	thing = require('./thing').thing,
	util = require('./util'),
	inspect = require('util').inspect,
	instance = util.instance;

function Tool(id, server, config) {
	const box = function tool() {
		return box.add.apply(null, arguments);
	};
	box.add = add.bind(null, id, box, server);
	// TODO readonly?
	box.id = id;

	return fill(id, box, server, config);
}

function add(id, box, server, path, handle) {
	if (path && !handle) {
		if (path.name) {
			handle = path;
			path = path.name;
		} else {
			throw new TypeError(`tool, unnamed function without path`);
		}
	}
	path = path.split('.');
	let space = path[1] ? path[0] : null,
		name = path[1] || path[0],
		scope = space ?
			box[space] = box[space] || {} :
			box;

	return scope[name] = typeof handle === 'function' ?
		function() {
			try {
				return handle.apply(this, arguments);
			} catch (thrown) {
				return Promise.reject(thrown);
			}
		} :
		function() {
			return server.send(
				box.id,
				'tool',
				[space ? space + '.' + name : name].concat(
					Array.prototype.slice.call(arguments)
				)
			);
		}
}

function fill(id, box, server) {
	box.storage = {
		named: {},
		stack: []
	};

	const simpleTool = (name) => box(name, true);

	const complexTool = (name, handle) => {
		const helper = function helper() {
			const args = Array.prototype.slice.call(arguments),
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
			debug.apply(null, [name].concat(formatArgs(arguments)));

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

	const thingTool = (name, things, types) => {
		const handle = function handle(what, where, options) {
			if (what instanceof Promise) {
				return what.then(
					(w) => handle(w, where, options)
				);
			}
			if (where instanceof Promise) {
				return where.then(
					(s) => handle(what, s, options)
				);
			}
			if (!what) {
				throw new TypeError(`${name}, invalid thing`);
			}
			what = thing(what);
			if (where === true && !options) {
				options = where;
				where = null;
			}
			where = where ?
				thing(where) :
				thing('window', undefined);

			debug.apply(null, [name].concat(
				formatArgs([what, where, options], arguments.length)
			));

			if (things) {
				if (things.indexOf(what.type) === -1 || things.indexOf('!' + what.type) !== -1) {
					throw new TypeError(`${name}, ${what.type} is not supported`);
				}
			}
			types = types ||
				['node', 'nodes', 'window'];
			if (types.indexOf(where.type) === -1 || types.indexOf('!' + where.type) !== -1) {
				throw new TypeError(`${name}, scope ${where.type} is not supported`);
			}

			return tool(name, options ? [what, where, options] : [what, where]);
		};

		return box(name, handle);
	};

	const tool = (name, args) => server.send(id, 'tool', [name].concat(args || []));

	const exec = (code, args, persistent) => server.exec(id, code, args, persistent);

	/**
	 * Checks presence of given {@link #Thing|Thing}.
	 * @function is
	 * @param {Thing|String|RegExp} what Thing to check presence of. String, Number or RegExp means {@link #text|text}.
	 * @param {Thing|String} [where=window] Thing to search in. String means {@link #nodes|nodes}.
	 * @param {Object|boolean} [options] Search {@link /tasty/?api=client#Tasty#tools.find|`options`}.
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
	 * @param {Thing|String|RegExp} what Thing to check absence of. String, Number or RegExp means {@link #text|text}.
	 * @param {Thing|String} [where=window] Thing to search in. String means {@link #nodes|nodes}.
	 * @param {Object|boolean} [options] Search {@link /tasty/?api=client#Tasty#tools.find|`options`}.
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
	 * @param {number|boolean} count Number of symbols to clear, `true` to clear all.
	 * @tool
	 */
	simpleTool('clear');

	/**
	 * Clicks given {@link #Thing|Thing}.
	 * @function click
	 * @param {Thing|String|RegExp} what Thing to click. String, Number or RegExp means {@link #text|text}.
	 * @param {Thing|String} [where=window] Thing to search in. String means {@link #nodes|nodes}.
	 * @param {Object|boolean} [options] Search {@link /tasty/?api=client#Tasty#tools.find|`options`}.
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
	 * @param {Object|boolean} [options] Search {@link /tasty/?api=client#Tasty#tools.find|`options`}.
	 * @throws {TypeError}
	 * @tool
	 */
	thingTool('dblclick', ['window', 'image', 'node', 'text']);

	/**
	 * Delays test execution.
	 * @function delay
	 * @param {number} ms Number of milliseconds to wait.
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
	 * @param {number} [delay=100]
	 * @param {number} [timeout=2000]
	 * @see {@link #until|until}
	 * @throws {TypeError}
	 * @tool
	 * @see {@link #exec|exec}
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
	 * Executes given function on client side. Reference to {@link /tasty/?api=client#Tasty|Tasty} instance is available as `this`.
	 * @function exec
	 * @param {Function} fn Function to call.
	 * @param {Array} [args=[]] List of arguments to call function with.
	 * @throws {TypeError}
	 * @tool
	 * @example
exec(
	function typeInto(text, what, where) {
		var tasty = this,
			found = tasty.dom.find(what, where);
		if (!found.length) {
			return new Error('...');
		}

		tasty.dom.focus(found[0]);
		tasty.tools.type(
			tasty.utils.trim(text)
		);
	},
	['...', node('input'), window]
);
	 */
	complexTool('exec', function(fn, args) {
		if (typeof fn !== 'function') {
			throw 'invalid function ' + fn;
		}

		return exec(
			// istanbul ignore next
			function exec(fn, args) {
				try {
					return fn.apply(this, args);
				} catch (thrown) {
					return thrown;
				}
			},
			[fn, args]
		);
	});

	/**
	 * Gets named value from runner storage.
	 * @function get
	 * @param {string} name Name.
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
	 * @param {number} go Argument for `history.go` call.
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
	 * @param {string} type Hook prefix: `before` or `after`.
	 * @param {Function} fn Function to call on client side.
	 * @param {Array} [args=[]] List of arguments to call `fn` with.
	 * @param {string[]} filter=[...] List of tools to call before/after.
	 * @param {boolean} [persistent=false] Preserve hook upon navigation.
	 * @throws {TypeError}
	 * @tool
	 * @see {@link /tasty/?api=client#Hooks#set|Hooks#set}
	 * @see {@link #exec|exec}
	 */
	complexTool('hook', (type, fn, args, filter, persistent) => {
		if (typeof type !== 'string') {
			throw 'invalid type ' + type;
		}
		if (typeof fn !== 'function') {
			throw 'invalid function ' + fn;
		}
		// TODO support '*' with excludes as '!...'; 'start', 'test', 'end';
		if (!Array.isArray(filter) || !filter.length) {
			throw 'invalid or empty filter';
		}
		filter = filter.map(
			(name) => type + '.' + name
		);

		return exec(
			// istanbul ignore next
			function hook(fn, args, filter) {
				var tasty = this;
				tasty.hooks.set(
					filter,
					function(result) {
						return tasty.utils.thenable(
							fn.apply(tasty, args)
						).then(function() {
							return result;
						});
					}
				);
			},
			[fn, args, filter],
			persistent
		);
	});

	/**
	 * Hovers given {@link #Thing|Thing}.
	 * @function hover
	 * @param {Thing|String|RegExp} what Thing to hover.
	 * @param {Thing|String} [where=window] Thing to search in. String means {@link #nodes|nodes}.
	 * @param {Object|boolean} [options] Search {@link /tasty/?api=client#Tasty#tools.find|`options`}.
	 * @throws {TypeError}
	 * @tool
	 */
	thingTool('hover', ['image', 'node', 'text']);

	/**
	 * Navigates client to given URL.
	 * @function navigate
	 * @param {string} url URL to navigate.
	 * @tool
	 */
	simpleTool('navigate');

	/**
	 * Pastes given text into focused field.
	 * @function paste
	 * @param {string} what Text to paste.
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
	 * Triggers client ready method.
	 * @function ready
	 * @tool
	 */
	/**
	 * (Re)sets client ready method.
	 * @function ready
	 * @param {string} method Ready method: `delay`, `document`, `exec`, `until`, `window`. If `null`, discard current ready method.
	 * @param {number|Function} [value] Method value.
	 * @param {string[]} [before=[...]] List of tools to perform ready checks before. If `null`, use defaults.
	 * @param {string[]} [after=[...]] List of tools to perform ready checks after. If `null`, use defaults.
	 * @param {boolean} [persistent=true] Preserve upon navigation.
	 * @throws {TypeError}
	 * @tool
	 * @see {@link #during|during}
	 * @see {@link #exec|exec}
	 * @see {@link #hook|hook}
	 * @see {@link #until|until}
	 */
	complexTool('ready', function(method, value, before, after, persistent) {
		if (!arguments.length) {
			return tool('ready');
		}
		before = Array.isArray(before) ?
			before :
			before ?
				[before] :
				[];
		after = Array.isArray(after) ?
			after :
			after ?
				[after] :
				[
					'click',
					'dblclick',
					'exec',
					'paste',
					'reconnect', // NOTE instead of history, navigate and reload.
					'ready',
					'type'
				];
		persistent = persistent !== false;
		const filter = before.map(
			(name) => 'before.' + name
		).concat(after.map(
			(name) => 'after.' + name
		));

		// NOTE 
		switch (method) {
			case null:
				return exec(
					// istanbul ignore next
					function reset(filter) {
						this.hook(filter, null);
					},
					[filter],
					persistent
				);
			case 'delay':
				return exec(
					// istanbul ignore next
					function ready(period, filter) {
						var tasty = this;
						tasty.hooks.set(
							filter,
							function delay(result) {
								return tasty.utils.delay(period, result);
							},
							'ready:delay ' + period
						);
					},
					[value | 0, filter],
					persistent
				);
			case 'document':
				return exec(
					// istanbul ignore next
					function ready(period, filter) {
						var tasty = this;
						tasty.hooks.set(
							filter,
							function(result) {
								return tasty.utils.thenable(
									// eslint-disable-next-line no-undef
									document.readyState === 'interactive' ||
										// eslint-disable-next-line no-undef
										document.readyState === 'complete' ?
											result :
											function(resolve) {
												// eslint-disable-next-line no-undef
												tasty.dom.on(document, 'DOMContentLoaded', resolve);
												// eslint-disable-next-line no-undef
												tasty.dom.on(document, 'readystatechage', function() {
													// eslint-disable-next-line no-undef
													(document.readyState === 'interactive' ||
														// eslint-disable-next-line no-undef
														document.readyState === 'complete') &&
															resolve();
												});
											}
								).then(function() {
									return period ?
										tasty.utils.delay(period, result) :
										result;
								});
							},
							period ?
								'ready:document ' + period :
								'ready:document'
						);
					},
					[value | 0, filter],
					persistent
				);
			case 'exec':
				return exec(
					// istanbul ignore next
					function ready(fn, filter) {
						var tasty = this;
						tasty.hooks.set(
							filter,
							function(result) {
								return tasty.utils.thenable(
									fn.call(tasty)
								).then(function() {
									return result;
								});
							},
							'ready:exec'
						);
					},
					[value, filter],
					persistent
				);
			case 'until':
				// TODO configurable period.
				// TODO use setTimeout();
				return exec(
					// istanbul ignore next
					function ready(fn, period, filter) {
						var tasty = this;
						tasty.hooks.set(
							filter,
							function(result) {
								return tasty.utils.thenable(function(resolve) {
									var interval = setInterval(function() {
										if (fn.call(tasty)) {
											clearInterval(interval);
											resolve(result);
										}
									}, period);
								});
							},
							'ready:until ' + period
						);
					},
					[value, 100, filter],
					persistent
				);
			case 'window':
				return exec(
					// istanbul ignore next
					function ready(period, filter) {
						var tasty = this;
						tasty.hooks.set(
							filter,
							function(result) {
								return tasty.utils.thenable(
									// eslint-disable-next-line no-undef
									document.readyState === 'complete' ?
										result :
										function(resolve) {
											// eslint-disable-next-line no-undef
											tasty.dom.on(window, 'load', resolve);
										}
								).then(function() {
									return period ?
										tasty.utils.delay(period, result) :
										result;
								});
							},
							period ?
								'ready:window ' + period :
								'ready:window'
						);
					},
					[value | 0, filter],
					persistent
				);
			default:
				// TODO extendable.
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
	 * @param {string|boolean} [url] URL to navigate. If `true`, reload page.
	 * @param {boolean} [persistent=false] Clear persistent hooks, e.g. `ready`.
	 * @tool
	 */
	complexTool('reset', (url, persistent) => {
		persistent &&
			server.deleteScripts(id);

		return tool('reset', [url]);
	});

	/**
	 * (Re)sets named value in runner storage.
	 * @function set
	 * @param {string} name Name.
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
	 * @param {string} what Text to type.
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
	 * @param {number} [delay=100] Delay in milliseconds between tries.
	 * @param {number} [timeout=2000] Timeout in milliseconds.
	 * @see {@link #during|during}
	 * @throws {TypeError}
	 * @tool
	 * @see {@link #exec|exec}
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

function formatArgs(args, length) {
	return Array.prototype.slice.call(args, 0, length || args.length)
		.map(
			(arg) => instance(arg, Function) || instance(arg, Array) ?
				inspect(arg, {colors: debug.useColors}) :
					arg && arg.toString ?
						arg.toString() :
						arg
		);
}
