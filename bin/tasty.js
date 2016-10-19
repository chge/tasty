#!/usr/bin/env node

'use strict';

process.title = 'Tasty';

const config = require('minimist')(process.argv.slice(2), {
	'--': true,
	alias: {
		a: 'addon', b: 'bail', c: 'coverage', e: 'exclude', x: 'exclude', f: 'format', h: 'help',
		p: 'reporter', q: 'quiet', r: 'runner', s: 'static', u: 'url', v: 'version', w: 'watch'
	},
	boolean: ['bail', 'help', 'version', 'verbose', 'quiet', 'watch'],
	string: ['addon', 'cert', 'coverage', 'exclude', 'format', 'key', 'passphrase', 'reporter', 'runner', 'server', 'slow', 'static']
});

const Tasty = require('../lib/main');

if (config.version) {
	console.log(
		'Tasty',
		require('../package.json').version
	);
	process.exit(0);
} else if (config.help) {
	console.log(
`Usage: tasty [options] [include] -- [exclude]

  --addon <name>,<name>  Module(s) to use as additional tools.
  -b, --bail             Fail fast, stop test runner on first fail.
  --cert <path>          Certificate for Tasty server.
  -c, --coverage <name>  Module to use as coverage instrumenter.
                         Built-ins: istanbul, nyc.
  -f, --format <name>    Report format for coverage reporter.
  -h, --help             Print this help and exit.
  --key <path>           Certificate key for Tasty server.
  --passphrase <string>  Certificate key passphrase for Tasty server.
  -p, --reporter <name>  Module to use as test reporter.
  -q, --quiet            Don't print Tasty-specific output.
  -r, --runner <name>    Module to use as test runner.
                         Built-ins: mocha, jasmine, qunit.
                         If omitted, use http://localhost:8765/
  --slow <ms>            Pause after each tool.
                         If blank, delay 500 ms.
  -s, --static <path>    Start built-in static server from path.
                         If blank, serve from CWD.
  -u, --url <url>        Protocol, host, port and path for Tasty server.
  --verbose              Verbose Tasty-specific output.
  -v, --version          Print Tasty version and exit.
  -w, --watch            Continue after first client.
`
	);
	process.exit(0);
} else {
	const tasty = new Tasty(
		Object.assign(config, {
			include: config._,
			exclude: process.argv.indexOf('--') === -1 ?
				null :
				config['--'],
			url: config['url'] || true
		})
	);
	tasty.on('end', (token, error) => {
		if (config.watch) {
			tasty.log &&
				tasty.log.log('watching');
		} else {
			const code = error ?
				(error.code | 0) || 1 :
				0;

			tasty.log &&
				tasty.log.log('exit', code);

			tasty.stop();
			// NOTE sometimes server ignores callback when running from CLI.
			// TODO .then();
			process.exit(code)
		}
	})
	.start();
}
