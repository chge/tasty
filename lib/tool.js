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

function fill(id, tool, server, config) {
	// NOTE client.

	tool('client.after', (fn, args, filter, persistent) =>
		registerHook(id, server, 'after.', fn, args, filter, persistent)
	);

	tool('client.before', (fn, args, filter, persistent) =>
		registerHook(id, server, 'before.', fn, args, filter, persistent)
	);

	tool('client.breakpoint');
	tool('client.exec', function(fn, args) {
		return server.exec(id, fn.toString(), args);
	});

	tool('client.go');
	tool('client.location');
	tool('client.navigate');

	tool('client.ready', (method, value, filter) =>
		registerReady(id, server, true, method, value, filter)
	);

	tool('client.reload');
	tool('client.reset', (url, persistent) => {
		persistent !== false &&
			server.deleteScripts(id);

		return server.send(id, 'tool', ['client.reset', url]);
	});

	// NOTE page.

	tool('page.font');
	tool('page.loaded');

	tool('page.ready', (method, value, filter) =>
		registerReady(id, server, false, method, value, filter)
	);

	tool('page.text');
	tool('page.title');

	// NOTE input.

	tool('input.clear');
	tool('input.click');
	tool('input.dblclick');
	tool('input.hover');
	tool('input.paste');
	tool('input.type');

	// NOTE runner.

	tool('runner.delay', (ms) => {
		return new Promise((resolve) => {
			setTimeout(resolve, ms | 0);
		});
	});

	tool('runner.get', () => {
		throw new TypeError('not implemented yet, sorry');
	});

	tool('runner.pop', () => {
		throw new TypeError('not implemented yet, sorry');
	});

	tool('runner.push', () => {
		throw new TypeError('not implemented yet, sorry');
	});

	tool('runner.set', () => {
		throw new TypeError('not implemented yet, sorry');
	});

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
			// TODO configurable.
			const period = 100;

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
				[filter, period | 0],
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
