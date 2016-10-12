#!/usr/bin/env node

'use strict';

process.title = 'Tasty';

const config = require('minimist')(process.argv.slice(2), {
	alias: {
		'b': 'bail', 'c': 'coverage', 'x': 'exclude', 'f': 'format', 'h': 'help', 'i': 'include',
		'p': 'reporter', 'r': 'runner', 's': 'server', 't': 'static', 'v': 'version', 'q': 'quiet', 'w': 'watch'
	},
	boolean: ['bail', 'help', 'version', 'verbose', 'quiet', 'watch'],
	string: ['assert', 'cert', 'coverage', 'expect', 'exclude', 'format', 'include', 'key', 'passphrase', 'reporter', 'runner', 'server', 'slow', 'static']
});

const Tasty = require('./server/main');

if (config.version) {
	console.log(
		'Tasty',
		require('../package.json').version
	);
	process.exit(0);
} else if (config.help) {
	console.log(
`Usage: tasty [options]

  --assert <name>        Module to use as assertion library.
  -b, --bail             Fail fast, stop test runner on first fail.
  --cert <path>          Certificate for Tasty server.
  -c, --coverage <name>  Module to use as coverage instrumenter.
  --expect <name>        Module to use as expectation library.
  -f, --format <name>    Module to use as coverage report generator.
  -x, --exclude <glob>   Exclude test files.
  -h, --help             Print this help and exit.
  -i, --include <glob>   Include test files.
  --key <path>           Certificate key for Tasty server.
  --passphrase <string>  Certificate key passphrase for Tasty server.
  -p, --reporter <name>  Module to use as test reporter.
  -r, --runner <name>    Module to use as test runner, built-ins:
                         mocha, jasmine, qunit.
  -s, --server <url>     Protocol, host, port and path for Tasty server.
                         If omitted, use http://localhost:8765/
  --slow <ms>            Pause after each tool.
                         If blank, delay 500 ms.
  -t, --static <path>    Start built-in static server from path.
                         If blank, serve from CWD.
  --verbose              Verbose Tasty-specific output.
  -v, --version          Print Tasty version and exit.
  -q, --quiet            Don't print Tasty-specific output.
  -w, --watch            Continue after first client.
`
	);
	process.exit(0);
} else {
	const tasty = new Tasty(
		Object.assign(config, {
			server: config['server'] || true
		})
	);
	tasty.on('end', (token, fail) => {
		if (config.watch) {
			tasty.log &&
				tasty.log.log('tasty', 'watching');
		} else {
			tasty.log &&
				tasty.log.log('tasty', 'exit', fail);

			tasty.stop();
			process.exit(fail | 0);
		}
	})
	.start();
}
