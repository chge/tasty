'use strict';

module.exports = tasty;

const glob = require('glob'),
	parse = require('url').parse,
	path = require('path');

const log = require('./log'),
	server = require('./server'),
	tool = require('./tool'),
	util = require('./util');

const DEFAULTS = {
	assert: false,
	autorun: true,
	bail: false,
	coverage: {
		instrumenter: '',
		reporter: ''
	},
	exclude: '',
	expect: false,
	globals: true,
	include: '',
	log: false,
	runner: 'mocha',
	reporter: 'spec',
	server: {
		url: 'http://0.0.0.0:8765'
	},
	slow: 0,
	static: {
		url: 'http://0.0.0.0:5678',
		root: '.'
	},
	watch: false
};

tasty.config = {};
tasty.finish = finish;
tasty.start = start;
tasty.off = off;
tasty.on = on;
tasty.once = once;
tasty.tool = tool;

tool.server = {
	exec: server.exec,
	send: server.send
};

// TODO disposable API without internal state.

function tasty(config) {
	config = tasty.config = Object.assign({}, tasty.config, DEFAULTS, config);

	log.logger = config.log === true ?
		console :
		config.log;

	if (config.coverage && !config.coverage.instrumenter) {
		config.coverage = false;
	}
	if (config.runner === 'qunit' && config.bail) {
		throw new Error('QUnit doesn\'t support bail');
	}
	if (config.runner === 'jasmine' && config.bail) {
		throw new Error('Jasmine doesn\'t support bail');
	}
	config.tests = config.include ?
		glob.sync(config.include, {ignore: config.exclude}) :
		[];
	if (config.server === false) {
		throw new Error('nothing to do without server');
	} else {
		config.server = config.server === true ?
			parse(DEFAULTS.server.url) :
			Object.assign(
				parse(DEFAULTS.server.url),
				config.server ?
					parse(
						config.server.url ||
							(typeof config.server === 'string' ? config.server : null) ||
								DEFAULTS.server.url
					) :
					null
			);
	}
	config.slow = parseInt(config.slow, 10);
	if (isNaN(config.slow)) {
		config.slow = 1000;
	}
	if (config.static) {
		const root = config.static.root ||
			DEFAULTS.static.root;

		config.static = config.static === true ?
			parse(DEFAULTS.static.url) :
			Object.assign(
				parse(DEFAULTS.static.url),
				parse(
					config.static.url ||
						(typeof config.static === 'string' ? config.static : null) ||
							DEFAULTS.static.url
				)
			);

		config.static.root = path.resolve(
			process.cwd(),
			root
		);
	}

	// TODO allow to filter globals?

	return tasty;
}

function start() {
	server.listen(tasty.config);

	return tasty;
}

function finish() {
	// TODO report.
	server.close();

	return tasty;
}

function off(...args) {
	server.emitter.removeListener(...args);

	return tasty;
}

function on(...args) {
	server.emitter.on(...args);

	return tasty;
}

function once(...args) {
	server.emitter.once(...args);

	return tasty;
}
