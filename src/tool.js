'use strict';

module.exports = tool;

// TODO pass tasty.config.

// NOTE user should define tool.server.emit(token, name, args, reconnect);

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
			return tool.server.emit(
				this.token,
				'tool',
				[space + '.' + name].concat(args),
				!!handle
			);
		};
}

tool('client.location');
tool('client.navigate', true);
tool('client.reload', true);

tool('dom.font');
tool('dom.loaded');
tool('dom.text');
tool('dom.title');

tool('input.click');
tool('input.press');
tool('input.type');

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
