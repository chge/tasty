'use strict';

module.exports = createTool;

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
					[].slice.call(arguments)
				)
			);
		}
}

function fill(id, tool, server, config) {
	// NOTE client.

	tool('client.breakpoint');
	tool('client.exec', function(fn) {
		return server.exec(id, fn.toString(), [].slice.call(arguments, 1));
	});

	tool('client.go');
	tool('client.location');
	tool('client.navigate');

	tool('client.ready', function() {
		return registerReady.apply(null, [id, server, true].concat(
			[].slice.call(arguments)
		));
	});

	tool('client.reload');
	tool('client.reset', (url, persistent) => {
		if (persistent !== false) {
			server.deleteScripts(id);
		}

		return server.send(id, 'tool', ['client.reset', url]);
	});

	// NOTE page.

	tool('page.font');
	tool('page.loaded');

	tool('page.ready', function() {
		return registerReady.apply(null, [id, server, false].concat(
			[].slice.call(arguments)
		));
	});

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

	tool('runner.until', (tool, args, delay) => {
		return new Promise((resolve) => {
			const repeat = () => {
				tool.handle.apply(null, args)
					.then(
						resolve,
						() => setTimeout(repeat, delay || 100)
					)
			};
			repeat();
		});
	});

	tool('runner.while', (tool, args, delay) => {
		return new Promise((resolve) => {
			const repeat = () => {
				let result;
				tool.handle.apply(null, args)
					.then(
						(res) => {
							result = res;
							setTimeout(repeat, delay || 100);
						},
						() => resolve(result)
					)
			};
			repeat();
		});
	});

	return tool;
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
	var tasty = this.tasty || this.require('tasty')
	tasty.hook(
		tasty.map(filter, function(name) {
			return 'after.' + name;
		}),
		function(result) {
			return (${value.toString()}).call(this, tasty)
				.then(function() {
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
				new Error(`unknown ready method '${method}'`)
			);
	}
}
