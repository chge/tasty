'use strict';

module.exports = createTool;

function createTool(token, server, config) {
	const box = function tool(...args) {
		return tool.add(...args);
	};
	box.add = add.bind(null, box, server);
	// TODO readonly?
	box.token = token;

	return fill(box, server, config);
}

function add(box, server, path, handle) {
	path = path.split('.');
	let space = path[1] ? path[0] : null,
		name = path[1] || path[0],
		scope = space ?
			box[space] = box[space] || {} :
			box;

	return scope[name] = typeof handle === 'function' ?
		handle :
		(...args) => server.send(
			box.token,
			'tool',
			[space + '.' + name].concat(args)
		);
}

function fill(tool, server, config) {
	// NOTE client.

	tool('client.breakpoint');
	tool('client.exec', function exec(fn, ...args) {
		return server.exec(this, fn.toString(), args);
	});

	tool('client.location');
	tool('client.navigate');

	tool('client.ready', function ready(...args) {
		return registerReady.apply(this, [server, true].concat(args));
	});

	tool('client.reload');
	tool('client.reset', function reset(url, persistent) {
		if (persistent !== false) {
			server.deleteScripts(this);
		}

		return server.send(this, 'tool', ['client.reset', url]);
	});

	// NOTE page.

	tool('page.font');
	tool('page.loaded');

	tool('page.ready', function ready(...args) {
		return registerReady.apply(this, [server, false].concat(args));
	});

	tool('page.text');
	tool('page.title');

	// NOTE input.

	tool('input.click');
	tool('input.paste');
	tool('input.type');

	// NOTE runner.

	tool('runner.delay', function delay(ms) {
		return new Promise(function(resolve) {
			setTimeout(resolve, ms | 0);
		});
	});

	tool('runner.until', function until(tool, ...args) {
		return new Promise(function(resolve) {
			const repeat = function() {
				tool.handle.apply(null, args)
					.then(
						resolve,
						() => setTimeout(repeat, 100)
					)
			};
			repeat();
		});
	});

	tool('runner.while', function until(tool, ...args) {
		return new Promise(function(resolve) {
			const repeat = function() {
				let result;
				tool.handle.apply(null, args)
					.then(
						(r) => {
							result = r;
							setTimeout(repeat, 100);
						},
						() => resolve(result)
					)
			};
			repeat();
		});
	});

	return tool;
}

function registerReady(server, persistent, method, value, filter) {
	filter = Array.isArray(filter) ?
		filter :
		filter ?
			[filter] :
			[
				'reconnect', // NOTE instead of client.navigate and client.reload.
				'input.click',
				'input.type'
			];

	switch (method) {
		case 'delay':
			return server.exec(
				this,
`function ready(method, value, filter) {
	var tasty = this.tasty || this.require('tasty');
	tasty.hook(
		tasty.map(filter, function(name) {
			return 'after.' + name;
		}),
		function delay(result) {
			return tasty.thenable(function(resolve) {
				setTimeout(resolve, value | 0);
			}).then(function() {
				return result;
			});
		}
	);
}`,
				[method, value, filter],
				persistent
			);
		case 'document':
			return server.exec(
				this,
`function ready(method, value, filter) {
	var tasty = this.tasty || this.require('tasty');
	tasty.hook(
		tasty.map(filter, function(name) {
			return 'after.' + name;
		}),
		function document(result) {
			return document.readyState === 'loading' ?
				tasty.thenable(function(resolve) {
					document.addEventListener('DOMContentLoaded', resolve);
				}).then(function() {
					return result;
				}) :
				result;
		}
	);
}`,
				[method, value, filter],
				persistent
			);
		case 'exec':
			return server.exec(
				this,
`function ready(filter) {
	var tasty = this.tasty || this.require('tasty')
	tasty.hook(
		tasty.map(filter, function(name) {
			return 'after.' + name;
		}),
		function exec(result) {
			return (${value.toString()}).call(this, tasty)
				.then(function() {
					return result;
				});
		}
	);
}`,
				[filter],
				persistent
			);
		case 'until':
			// TODO configurable.
			const period = 100;

			return server.exec(
				this,
`function ready(filter, period) {
	var tasty = this.tasty || this.require('tasty');
	tasty.hook(
		tasty.map(filter, function(name) {
			return 'after.' + name;
		}),
		function until(result) {
			return tasty.thenable(function(resolve) {
				var interval = setInterval(function check() {
					if ((${value.toString()}).call(this, tasty)) {
						clearInterval(interval);
						resolve(result);
					}
				}, period);
			});
		}
	);
}`,
				[filter, period],
				persistent
			);
		default:
			// TODO allow client to implement?
			throw new Error(`unknown ready method '${method}'`);
	}
}
