'use strict';

module.exports = tasty;

const glob = require('glob'),
	parse = require('url').parse,
	path = require('path');

const log = require('./log'),
	server = require('./server'),
	tool = require('./tool');

const DEFAULTS = {
	bail: false,
	exclude: '',
	exit: true,
	globals: true,
	include: '',
	log: true,
	runner: 'mocha',
	server: {
		url: 'http://0.0.0.0:8765'
	},
	static: {
		url: 'http://0.0.0.0:5678',
		root: '.'
	}
};

tasty.config = {};
tasty.finish = finish;
tasty.start = start;
tasty.tool = tool;

tool.server = {
	emit: server.emit
};

function tasty(config) {
	config = Object.assign(tasty.config, DEFAULTS, config);

	log.logger = config.log === true ?
		console :
		config.log;

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
}

function finish() {
	server.close();
}
