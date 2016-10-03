'use strict';

module.exports = tool;

const log = require('./log');

// TODO pass inject config?

// NOTE user must inject tool.server.exec(token, fn, args, reconnect);
// NOTE user must inject tool.server.send(token, name, args, reconnect);

function tool(path, handle) {
	path = path.split('.');
	let space = path[1] ? path[0] : null,
		name = path[1] || path[0],
		scope = space ?
			tool[space] = tool[space] || {} :
			tool;

	return scope[name] = typeof handle === 'function' ?
		handle :
		// NOTE preserve this.
		function(...args) {
			return tool.server.send(
				this,
				'tool',
				[space + '.' + name].concat(args),
				// NOTE force wait for reconnect.
				// TODO consider sync message.
				!!handle
			);
		};
}

function register(persistent, method, value, filter) {
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
			return tool.server.exec(
				this,
`function ready(method, value, filter) {
	var tasty = this.tasty || this.require('tasty');
	tasty.hook(
		filter.map(function(name) {
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
				// TODO consider sync message.
				false,
				persistent
			);
		case 'document':
			return tool.server.exec(
				this,
`function ready(method, value, filter) {
	var tasty = this.tasty || this.require('tasty');
	tasty.hook(
		filter.map(function(name) {
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
				// TODO consider sync message.
				false,
				persistent
			);
		case 'exec':
			return tool.server.exec(
				this,
`function ready(filter) {
	var tasty = this.tasty || this.require('tasty')
	tasty.hook(
		filter.map(function(name) {
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
				// TODO consider sync message.
				false,
				persistent
			);
		case 'until':
			// TODO configurable.
			const period = 100;

			return tool.server.exec(
				this,
`function ready(filter, period) {
	var tasty = this.tasty || this.require('tasty');
	tasty.hook(
		filter.map(function(name) {
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
				// TODO consider sync message.
				false,
				persistent
			);
		default:
			// TODO allow client to implement?
			throw new Error('unknown ready method ' + method);
	}
}

// NOTE client.

tool('client.exec', function exec(fn, ...args) {
	return tool.server.exec(this, fn.toString(), args);
});

tool('client.location');
tool('client.navigate', true);

tool('client.ready', function ready(...args) {
	return register.apply(this, [true].concat(args));
});

tool('client.reload', true);

// NOTE page.

tool('page.font');
tool('page.loaded');

tool('page.ready', function ready(...args) {
	return register.apply(this, [false].concat(args));
});

tool('page.text');
tool('page.title');

// NOTE input.

tool('input.click');
tool('input.press');
tool('input.ready');
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
