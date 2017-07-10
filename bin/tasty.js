#!/usr/bin/env node

'use strict';

process.title = 'Tasty';

const config = require('minimist')(process.argv.slice(2), {
	'--': true,
	alias: {
		a: 'addon', b: 'bail', c: 'coverage', C: 'coverage-reporter',
		i: 'static-index', h: 'help', o: 'runner-output', O: 'coverage-output',
		q: 'quiet', r: 'runner', R: 'runner-reporter', s: 'static',
		u: 'url', v: 'version', w: 'watch'
	},
	boolean: [
		'bail', 'colors', 'help', 'quiet', 'verbose', 'version', 'watch'
	],
	string: [
		'addon', 'cert', 'config', 'coverage', 'coverage-output', 'coverage-reporter',
		'key', 'passphrase', 'runner', 'runner-output', 'runner-reporter',
		'slow', 'static', 'static-index', 'url'
	]
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
`Usage: tasty [include] [options] [-- exclude]

  --addon <name>,<name>  Module(s) to use as additional tools.
  -b, --bail             Fail fast, stop test runner on first fail.
  --cert <path>          Certificate for Tasty server.
  --colors               Enable colored output, if supported by runner.
  --config <path>        JSON config.
  -c, --coverage <name>  Module to use as coverage instrumenter.
                         Built-ins: istanbul, nyc.
  -O, --coverage-output <path>
                         Output directory for coverage reporter.
  -C, --coverage-reporter <name>
                         Module to use as coverage reporter.
  -h, --help             Print this help and exit.
  --key <path>           Certificate key for Tasty server.
  --passphrase <string>  Certificate key passphrase for Tasty server.
  -q, --quiet            Don't print Tasty-specific output.
  -r, --runner <name>    Module to use as test runner.
                         Built-ins: mocha, jasmine, qunit.
  -o, --runner-output <path>
                         Output directory for test reporter.
                         If omitted, report to stdout.
  -R, --runner-reporter <name>
                         Module to use as test reporter.
  --slow <ms>            Pause after each tool.
                         If blank, delay 500 ms.
  -s, --static <path>    Start built-in static server from path.
                         If blank, serve from CWD.
  -i, --static-index <path>
                         Path to static index (fallback) file.
                         If set, respond with that file instead of 404.
  -u, --url <url>        Protocol, host, port and path for Tasty server.
                         If omitted, use http://localhost:8765/
  --verbose              Verbose Tasty-specific output.
  -v, --version          Print Tasty version and exit.
  -w, --watch            Continue after first client.
`
	);
	process.exit(0);
} else {
	if (config.config) {
		Object.assign(config, JSON.parse(
			require('fs').readFileSync(config.config)
		));
	}
	const exclude = process.argv.indexOf('--') === -1 ?
			config.exclude || null :
			[].concat(
				config.exclude || [],
				config['--'] || []
			),
		include = [].concat(
			config.include || [],
			config._ || []
		),
		tasty = new Tasty(
			Object.assign(config, {
				exclude: exclude,
				include: include,
				url: config.url || true
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

			tasty.stop().then(
				() => process.exit(code)
			);
		}
	})
	.start().catch(
		(error) => process.exit(
			(error.code | 0) || 255
		)
	);
}
