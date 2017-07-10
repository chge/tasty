'use strict';

const Emitter = require('events').EventEmitter,
	parseUrl = require('url').parse,
	resolvePath = require('path').resolve;

const Server = require('./server'),
	util = require('./util');

const DEFAULTS = {
	globals: true,
	quiet: true,
	runner: 'mocha',
	slow: 0
};

class Log {
	/**
	 * @private
	 */
	constructor(api, verbose) {
		const noop = () => {};

		this.trace = api && api.trace ? api.trace.bind(api) :
			verbose && api && api.log ? api.log.bind(api) : noop;
		this.debug = api && api.debug ? api.debug.bind(api) :
			verbose && api && api.log ? api.log.bind(api) : noop;
		this.dir = api && api.dir ? api.dir.bind(api) : noop;
		this.log = api && api.log ? api.log.bind(api) : noop;
		this.info = api && api.info ? api.info.bind(api) : noop;
		this.warn = api && api.warn ? api.warn.bind(api) : noop;
		this.error = api && api.error ? api.error.bind(api) : noop;
	}
}

/**
 * Server-side API available in {@link https://nodejs.org/|Node.js} environment.
 * @example
const Tasty = require('tasty'),
	tasty = new Tasty({
		include: ['/test/*.js']
	});
tasty.on('end', (token, error) => {
	tasty.stop().then(() => {
		process.exit(error ? error.code : 0);
	});
}).start();
 */
class Tasty {
	/**
	 * @param {Object} [config] Tasty server configuration.
	 * @param {String} [config.addon] Module(s) to use as additional tools.
	 * @param {Boolean} [config.bail=false] Fail fast, stop test runner on first fail.
	 * @param {String} [config.cert] Certificate for Tasty server.
	 * @param {Object|Boolean} [config.console=true] API to override default `console`. Overrides `quiet` config.
	 * @param {String} [config.coverage] Module to use as coverage instrumenter. Built-ins: `'istanbul'`, `'nyc'`.
	 * @param {String} [config.coverageOutput='coverage'] Output directory for coverage reporter.
	 * @param {String} [config.coverageReporter] Module to use as coverage reporter.
	 * @param {String[]} [config.exclude] Test globs to exclude.
	 * @param {Boolean} [config.globals=true] Inject globals into {@link /tasty/?api=test#tasty|runner environment}.
	 * @param {String[]} [config.include] Test globs to include.
	 * @param {String} [config.key] Certificate key for Tasty server.
	 * @param {String} [config.passphrase] Certificate key passphrase for Tasty server.
	 * @param {Boolean} [config.quiet=true] Don't print Tasty-specific output.
	 * @param {String} [config.runner='mocha'] Module to use as test runner. Built-ins: `'mocha'`, `'jasmine'`, `'qunit'`.
	 * @param {String} [config.runnerOutput] Output directory for test reporter. If omitted, report to `stdout`.
	 * @param {String} [config.runnerReporter] Module to use as test reporter.
	 * @param {Number|Boolean} [config.slow] Pause after each tool in milliseconds. If `true`, pause is 500 ms.
	 * @param {String|Boolean} [config.static] Path to serve static content from. If `true`, serve from CWD.
	 * @param {String} [config.staticIndex] Path to static index (fallback) file.
	 * @param {String} [config.url='http://0.0.0.0:8765/'] Tasty server URL.
	 * @param {Boolean} [config.verbose=false] Verbose Tasty-specific output.
	 * @param {Boolean} [config.watch=false] Continue after first client.
	 */
	constructor(config) {
		const tasty = this || {};
		config = Object.assign({}, DEFAULTS, config);

		tasty.config = config;
		tasty.emitter = new Emitter();
		// NOTE every tool subscribes on reconnect event of every client.
		tasty.emitter.setMaxListeners(Infinity);
		// NOTE prevent default error handling.
		tasty.emitter.on('error', () => {});
		// TODO winston.
		tasty.log = new Log(
			'console' in config ?
				config.console :
				config.quiet ?
					null :
					console,
			config.verbose
		);

		// TODO allow to filter globals.
		if (config.bail) {
			// TODO support with hacks?
			if (config.runner === 'jasmine') {
				throw new TypeError('Jasmine doesn\'t support bail');
			}
			if (config.runner === 'qunit') {
				throw new TypeError('QUnit doesn\'t support bail');
			}
		}
		config.coverageOutput = config.coverageOutput ||
			config['coverage-output'];
		config.coverageReporter = config.coverageReporter ||
			config['coverage-reporter'];
		if (!config.include || !config.include.length) {
			tasty.log.warn('tasty', 'no test files specified');
		} else if (!util.glob(config.include, config.exclude).length) {
			tasty.log.warn('tasty', 'no test files found');
		}
		if (config.exclude && !config.exclude.length) {
			tasty.log.warn('tasty', 'invalid exclude pattern');
		}
		config.runnerOutput = config.runnerOutput ||
			config['runner-output'];
		config.runnerReporter = config.runnerReporter ||
			config['runner-reporter'];
		config.slow = parseInt(config.slow, 10);
		if (isNaN(config.slow)) {
			config.slow = 500;
		}
		if (config.static) {
			config.static = config.static === true ?
				process.cwd() :
				resolvePath(
					process.cwd(),
					config.static
				);
			config.staticIndex = config.staticIndex ?
				resolvePath(
					// TODO intelligently resolve from config.static;
					process.cwd(),
					config.staticIndex ||
						config['static-index']
				) :
				null;
		}
		const url = config.cert || config.key ?
			'https://0.0.0.0:8765/' :
			'http://0.0.0.0:8765/';
		config.url = !config.url || config.url === true ?
			parseUrl(url) :
			Object.assign(
				parseUrl(url),
				parseUrl(config.url.indexOf('//') === -1 ? 'http://' + config.url : config.url, false, true)
			);
		config.url.path = config.url.path.endsWith('/') ?
			config.url.path :
			config.url.path + '/';

		tasty.server = new Server(tasty.emitter, tasty.log, config);

		return tasty;
	}

	/**
	 * Starts Tasty server.
	 * @returns {Promise}
	 */
	start() {
		return this.server.listen(this.config);
	}

	/**
	 * Stops Tasty server.
	 * @returns {Promise}
	 */
	stop() {
		return this.server.close();
	}

	/**
	 * Removes listener.
	 * @param {String|Symbol} eventName The name of the event.
	 * @param {Function} listener The callback function.
	 * @returns {Tasty} Reference to Tasty instance for chaining.
	 * @see {@link https://nodejs.org/dist/latest/docs/api/events.html#events_emitter_removelistener_eventname_listener|EventEmitter.removeListener}
	 */
	off() {
		this.emitter.removeListener.apply(this.emitter, arguments);

		return this;
	}

	/**
	 * Adds listener.
	 * @param {String|Symbol} eventName The name of the event.
	 * @param {Function} listener The callback function.
	 * @returns {Tasty} Reference to Tasty instance for chaining.
	 * @see {@link https://nodejs.org/dist/latest/docs/api/events.html#events_emitter_on_eventname_listener|EventEmitter.on}
	 */
	on() {
		this.emitter.on.apply(this.emitter, arguments);

		return this;
	}

	/**
	 * Adds one time listener.
	 * @param {String|Symbol} eventName The name of the event.
	 * @param {Function} listener The callback function.
	 * @returns {Tasty} Reference to Tasty instance for chaining.
	 * @see {@link https://nodejs.org/dist/latest/docs/api/events.html#events_emitter_once_eventname_listener|EventEmitter.once}
	 */
	once() {
		this.emitter.once.apply(this.emitter, arguments);

		return this;
	}
}

Tasty.Tasty = Tasty;

module.exports = Tasty;
