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
} else if (!Object.keys(config).length || Object.keys(config).length === 1 && config.help === true) {
	console.log(
`Usage: tasty --include=glob ...

  --assert=module-name
  --bail=true|false
  --expect=module-name
  --exclude=file-glob
  --exit=true|false
  --globals=true|false
  --include=file-glob
  --mode=single|multiple
  --log=true|false
  --runner=module-name|mocha|jasmine|qunit
  --server
  --server=true|false
  --server-url=http://localhost:8765/path
  --slow=ms
  --static
  --static=true|false
  --static-url=http://localhost:5678/path
  --static-root=path
`
	);
	process.exit(0);
} else {
	tasty(
		Object.assign(config, {
			coverage: config['coverage-reporter'] ?
				{instrumenter: config['coverage'], reporter: config['coverage-reporter']} :
				config['coverage'] ?
					{instrumenter: config['coverage']} :
					false,
			log: config['log'] || true,
			server: config['server-url'] ?
				{url: config['server-url']} :
				config['server'],
			static: config['static-url'] || config['static-root'] ?
				{url: config['static-url'], root: config['static-root']} :
				config['static']
		})
	)
		.on('finish', (fail) => {
			if (config.exit) {
				console.log('exit', fail);
				process.exit(fail | 0);
			} else {
				console.log('waiting for next client');
			}
		})
		.start();
}
