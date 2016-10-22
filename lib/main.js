'use strict';

const Emitter = require('events').EventEmitter,
	parseUrl = require('url').parse,
	resolvePath = require('path').resolve;

const Server = require('./server'),
	util = require('./util');

const DEFAULTS = {
	autorun: true,
	globals: true,
	quiet: true,
	runner: 'mocha',
	slow: 0,
	static: '.',
	url: 'http://0.0.0.0:8765/'
};

class Log {
	constructor(api) {
		const noop = () => {},
			prefix = 'tasty';
		// TODO dynamic prefix?

		this.debug = api && api.debug ? api.debug.bind(api, prefix) : noop;
		this.log = api && api.log ? api.log.bind(api, prefix) : noop;
		this.info = api && api.info ? api.info.bind(api, prefix) : noop;
		this.warn = api && api.warn ? api.warn.bind(api, prefix) : noop;
		this.error = api && api.error ? api.error.bind(api, prefix) : noop;
	}
}

class Tasty {
	constructor(config) {
		const tasty = this || {};
		config = Object.assign({}, DEFAULTS, config);

		tasty.config = config;
		tasty.emitter = new Emitter();
		// NOTE every tool subscribes on reconnect event of every client.
		tasty.emitter.setMaxListeners(Infinity);
		// NOTE prevent default error handling.
		tasty.emitter.on('error', () => {});
		tasty.log = new Log(
			config.console ?
				config.console :
				config.quiet ?
					null :
					console
		);

		// TODO allow to filter globals.
		if (config.bail) {
			// TODO support with hacks?
			if (config.runner === 'jasmine') {
				throw new Error('Jasmine doesn\'t support bail');
			}
			if (config.runner === 'qunit') {
				throw new Error('QUnit doesn\'t support bail');
			}
		}
		config.coverageOutput = config.coverageOutput ||
			config['coverage-output'];
		config.coverageReporter = config.coverageReporter ||
			config['coverage-reporter'];
		if (config.exclude && !config.exclude.length) {
			tasty.log.warn('invalid exclude pattern');
		}
		if (!config.include || !config.include.length) {
			tasty.log.warn('no test files specified');
		} else if (!util.glob(config.include, config.exclude).length) {
			tasty.log.warn('no test files found');
		}
		config.runnerOutput = config.runnerOutput ||
			config['runner-output'];
		config.runnerReporter = config.runnerReporter ||
			config['runner-reporter'];
		config.slow = parseInt(config.slow, 10);
		if (isNaN(config.slow)) {
			config.slow = 1000;
		}
		if (config.static) {
			config.static = config.static === true ?
				process.cwd() :
				resolvePath(
					process.cwd(),
					config.static
				);
		}
		if (config.url) {
			config.url = config.url === true ?
				parseUrl(DEFAULTS.url) :
				Object.assign(
					parseUrl(DEFAULTS.url),
					parseUrl(config.url.indexOf('//') === -1 ? 'http://' + config.url : config.url, false, true)
				);
		} else {
			throw new Error('nothing to do without server');
		}

		tasty.server = new Server(tasty.emitter, tasty.log, config);

		return tasty;
	}

	start() {
		return this.server.listen(this.config);
	}

	stop() {
		return this.server.close();
	}

	off() {
		this.emitter.removeListener.apply(this.emitter, arguments);

		return this;
	}

	on() {
		this.emitter.on.apply(this.emitter, arguments);

		return this;
	}

	once() {
		this.emitter.once.apply(this.emitter, arguments);

		return this;
	}
}

Tasty.Tasty = Tasty;
module.exports = Tasty;
