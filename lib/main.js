'use strict';

const Emitter = require('events').EventEmitter,
	parseUrl = require('url').parse,
	resolvePath = require('path').resolve;

const context = require('./context'),
	coverage = require('./coverage'),
	debug = require('debug')('tasty'),
	runner = require('./runner'),
	server = require('./server'),
	util = require('./util'),
	version = require('../package').version;

const DEFAULTS = {
	globals: true,
	quiet: true,
	runner: 'mocha',
	slow: 0
};

/**
 * Console-style logger.
 */
class Logger {
	/**
	 * @param {Object} api Console-style API.
	 * @param {boolean} verbose Enable `debug` and `trace`.
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
	 * Parsed config.
	 * @name Tasty#config
	 * @type {Object}
	 * @readonly
	 */

	/**
	 * {@link #Logger|Logger} instance.
	 * @name Tasty#logger
	 * @type {Logger}
	 * @readonly
	 */

	/**
	 * Tasty version.
	 * @name Tasty#version
	 * @type {string}
	 * @readonly
	 */

	/**
	 * @param {Object} [config] Tasty server configuration.
	 * @param {string} [config.addon] Module(s) to use as additional tools.
	 * @param {boolean} [config.bail=false] Fail fast, stop test runner on first fail.
	 * @param {string} [config.cert] Certificate for Tasty server.
	 * @param {Object|boolean} [config.console=true] API to override default `console`. Overrides `quiet` config.
	 * @param {string} [config.coverage] Module to use as coverage instrumenter. Built-ins: `'istanbul'`, `'nyc'`.
	 * @param {string} [config.coverageOutput='coverage'] Output directory for coverage reporter.
	 * @param {string} [config.coverageReporter] Module to use as coverage reporter.
	 * @param {string[]} [config.exclude] Test globs to exclude.
	 * @param {boolean} [config.globals=true] Automatically inject {@link /tasty/?api=test#tasty|test API} into runner environment.
	 * @param {string[]} [config.include] Test globs to include.
	 * @param {string} [config.key] Certificate key for Tasty server.
	 * @param {string} [config.passphrase] Certificate key passphrase for Tasty server.
	 * @param {boolean} [config.quiet=true] Don't print Tasty-specific output.
	 * @param {string} [config.runner='mocha'] Module to use as test runner. Built-ins: `'mocha'`, `'jasmine'`, `'qunit'`.
	 * @param {string} [config.runnerOutput] Output directory for test reporter. If omitted, report to `stdout`.
	 * @param {string} [config.runnerReporter] Module to use as test reporter.
	 * @param {number|boolean} [config.slow] Pause after each tool in milliseconds. If `true`, pause is 300 ms.
	 * @param {string|boolean} [config.static] Path to serve static content from. If `true`, serve from CWD.
	 * @param {string} [config.staticIndex] Path to static index (fallback) file.
	 * @param {string} [config.url='http://0.0.0.0:8765/'] Tasty server URL.
	 * @param {boolean} [config.verbose=false] Verbose Tasty-specific output.
	 * @param {boolean} [config.watch=false] Continue after first client.
	 */
	constructor(config) {
		if (!this) {
			return new Tasty(config);
		}
		config = Object.assign({}, DEFAULTS, config);

		// TODO winston?
		const logger = new Logger(
			'console' in config ?
				config.console :
				config.quiet ?
					null :
					console,
			config.verbose
		);

		this.config = config;
		this.emitter = new Emitter();
		// NOTE every tool subscribes on connect event of every client.
		this.emitter.setMaxListeners(Infinity);
		// NOTE prevent default error handling.
		this.emitter.on('error', () => {});
		this.logger = logger;
		this.version = version;

		// NOTE command line takes precedence over file config.
		// TODO allow to filter globals.
		config.coverageOutput = config['coverage-output'] ||
			config.coverageOutput;
		config.coverageReporter = config['coverage-reporter'] ||
			config.coverageReporter;
		if (!config.include || !config.include.length) {
			this.logger.warn('tasty', 'no test files specified');
		} else if (!util.glob(config.include, config.exclude).length) {
			this.logger.warn('tasty', 'no test files found');
		}
		if (config.exclude && !config.exclude.length) {
			this.logger.warn('tasty', 'invalid exclude pattern');
		}
		config.runnerOutput = config['runner-output'] ||
			config.runnerOutput;
		config.runnerReporter = config['runner-reporter'] ||
			config.runnerReporter;
		config.slow = parseInt(config.slow, 10);
		if (isNaN(config.slow)) {
			config.slow = 300;
		}
		if (config.static) {
			config.static = config.static === true ?
				process.cwd() :
				resolvePath(
					process.cwd(),
					config.static
				);
			const index = config['static-index'] ||
				config.staticIndex;
			config.staticIndex = index ?
					resolvePath(
						// TODO intelligently resolve from config.static;
						process.cwd(),
						index
					) :
					undefined;
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

		/**
		 * Reference to {@link #Context|Context} class which will be instantiated for each runner.
		 * @name Context
		 * @type {Function}
		 */
		this.Context = context.getContext(config);

		/**
		 * Reference to specific {@link #Coverage|Coverage} class which will be instantiated for each client.
		 * @name Coverage
		 * @type {Function}
		 */
		this.Coverage = coverage.getCoverage(config);

		/**
		 * Reference to specific {@link #Runner|Runner} class which will be instantiated for each client.
		 * @name Runner
		 * @type {Function}
		 */
		this.Runner = runner.getRunner(config);

		/**
		 * Reference to {@link #Server|Server} class which will be instantiated on {@link #start|start} call.
		 * @name Server
		 * @type {Function}
		 */
		this.Server = server.getServer(config);

		debug('config', util.formatConfig(config));
	}

	/**
	 * Starts Tasty server.
	 * @returns {Promise}
	 */
	start() {
		this.server = this.server ||
			new this.Server(this);

		return this.server.listen();
	}

	/**
	 * Stops Tasty server.
	 * @returns {Promise}
	 */
	stop() {
		return this.server ?
			this.server.close() :
			Promise.reject(
				new Error('tasty is not started')
			);
	}

	/**
	 * Removes listener.
	 * @param {string|Symbol} eventName The name of the event.
	 * @param {Function} listener The callback function.
	 * @returns {Tasty} {@link #Tasty|Tasty} instance for chaining.
	 * @see {@link https://nodejs.org/dist/latest/docs/api/events.html#events_emitter_removelistener_eventname_listener|EventEmitter.removeListener}
	 */
	off() {
		this.emitter.removeListener.apply(this.emitter, arguments);

		return this;
	}

	/**
	 * Adds listener.
	 * @param {string|Symbol} eventName The name of the event.
	 * @param {Function} listener The callback function.
	 * @returns {Tasty} {@link #Tasty|Tasty} instance for chaining.
	 * @see {@link https://nodejs.org/dist/latest/docs/api/events.html#events_emitter_on_eventname_listener|EventEmitter.on}
	 */
	on() {
		this.emitter.on.apply(this.emitter, arguments);

		return this;
	}

	/**
	 * Adds one time listener.
	 * @param {string|Symbol} eventName The name of the event.
	 * @param {Function} listener The callback function.
	 * @returns {Tasty} {@link #Tasty|Tasty} instance for chaining.
	 * @see {@link https://nodejs.org/dist/latest/docs/api/events.html#events_emitter_once_eventname_listener|EventEmitter.once}
	 */
	once() {
		this.emitter.once.apply(this.emitter, arguments);

		return this;
	}
}

/**
 * Reference to {@link #Context|Context} class.
 */
Tasty.Context = context.Context;

/**
 * Reference to {@link #Coverage|Coverage} base class.
 */
Tasty.Coverage = coverage.Coverage;

/**
 * Reference to {@link #Logger|Logger} class.
 */
Tasty.Logger = Logger;

/**
 * Reference to {@link #Runner|Runner} base class.
 */
Tasty.Runner = runner.Runner;

/**
 * Reference to {@link #Server|Server} class.
 */
Tasty.Server = server.Server;

/**
 * Reference to {@link #Tasty|Tasty} class.
 */
Tasty.Tasty = Tasty;

module.exports = Tasty;
