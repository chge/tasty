#!/usr/bin/env node

'use strict';

process.title = 'Tasty';

let tasty = require('./server/main');

// TODO use minimist.
let config = {};
[].slice.call(process.argv, 2).forEach((arg) => {
	arg = arg.split('=');
	let name = arg[0].split('--')[1],
		value = arg[1];
	if (name) {
		config[name] = arg.length === 1 ?
			true :
			value === 'false' ?
				false :
				value === 'true' ?
					true :
					value;
	}
});

if (Object.keys(config).length === 1 && config.version === true) {
	console.log(
		'Tasty',
		require('../package.json').version
	);
	process.exit(0);
} else if (Object.keys(config).length === 1 && config.help === true) {
	console.log(
`Usage: tasty --include=glob ...
	--assert=name
	--expect=name
	--exclude=test/lib/*.js
	--exit=true|false
	--globals=true|false
	--include=test/*.js
	--mode=single|multiple
	--log=true|false
	--runner=mocha|jasmine|qunit
	--server
	--server=true|false
	--server-url=http://localhost:8765/path
	--static
	--static=true|false
	--static-url=http://localhost:5678/path
	--static-root=path/to/root`
	);
	process.exit(0);
} else {
	tasty(
		Object.assign(config, {
			server: config['server-url'] ?
				{url: config['server-url']} :
				config['server'],
			static: config['static-url'] || config['static-root'] ?
				{url: config['static-url'], root: config['static-root']} :
				config['static']
		})
	).start();
}
