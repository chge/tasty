#!/usr/bin/env node

'use strict';

process.title = 'Tasty';

let server = require('./server');

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
	console.log('Usage: tasty --runner=runner --include=glob --exclude=glob ...');
	process.exit(0);
} else {
	server(config).listen();
}
