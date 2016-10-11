'use strict';

const Emitter = require('events').EventEmitter,
	parseUrl = require('url').parse,
	resolvePath = require('path').resolve;

const Server = require('./server'),
	util = require('./util');

const DEFAULTS = {
	autorun: true,
	exclude: '',
	globals: true,
	include: '',
	runner: 'mocha',
	server: 'http://0.0.0.0:8765/',
	slow: 0,
	static: '.',
	quiet: true
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
		tasty.emitter.setMaxListeners(100);
		tasty.log = new Log(
			config.quiet ?
				null :
				config.console ||
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
		if (config.server) {
			config.server = config.server === true ?
				parseUrl(DEFAULTS.server) :
				Object.assign(
					parseUrl(DEFAULTS.server),
					parseUrl(config.server.indexOf('//') === -1 ? 'http://' + config.server : config.server, false, true)
				);
		} else {
			throw new Error('nothing to do without server');
		}
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

		tasty.server = new Server(tasty.emitter, tasty.log, config);

		return tasty;
	}

	start() {
		return this.server.listen(this.config);
	}

	close() {
		return this.server.close();
	}

	off(...args) {
		this.emitter.removeListener(...args);

		return this;
	}

	on(...args) {
		this.emitter.on(...args);

		return this;
	}

	once(...args) {
		this.emitter.once(...args);

		return this;
	}
}

Tasty.Tasty = Tasty;
module.exports = Tasty;
