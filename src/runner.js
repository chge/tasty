'use strict';

module.exports = {
	prepare: prepare
};

const sandbox = require('tasty-sandbox');

const log = require('./log'),
	tool = require('./tool');

function prepare(token, config) {
	if (config.runner && config.runner.run) {
		log('client', token, 'runner', config.runner.name || 'custom');

		return config.runner;
	}
	log('client', token, 'runner', config.runner);

	switch (config.runner) {
		case 'mocha':
			const Mocha = sandbox.require(
					find('mocha'),
					context(token, config)
				),
				mocha = new Mocha({
					ui: 'bdd',
					bail: config.bail === true
					// TODO reporter.
				});
			config.tests.forEach((file) => mocha.addFile(file));

			return {
				run: () => {
					return new Promise((resolve, reject) => {
						mocha.run((error) => {
							error ?
								reject(error) :
								resolve();
						});
					});
				}
			};
		case 'jasmine':
			const Jasmine = sandbox.require(
					find('jasmine'),
					context(token, config)
				),
				jasmine = new Jasmine();
			jasmine.loadConfig({
				spec_files: config.tests
			});
			jasmine.configureDefaultReporter({
				showColors: config.colors === true
			});

			return {
				run: () => {
					return new Promise((resolve, reject) => {
						jasmine.onComplete((passed) => {
							passed ?
								resolve() :
								reject(1); // TODO number of fails.
						});
						jasmine.execute();
					});
				}
			};
		default:
			// TODO resolve plugins.
			throw new Error(`unknown runner '${config.runner}'`);
	}
}

function context(token, config) {
	const queue = function queue(done) {
		let chain = Promise.resolve();
		queue.chain.forEach((link) => {
			chain = chain.then(link);
		});

		if (typeof done === 'function') {
			chain.then(done);
		} else {
			return chain;
		}
	};
	queue.chain = [];

	const wrap = (tool) => {
		return (...args) => new Promise(function(resolve) {
			queue.chain.push(function() {
				var promise = tool.apply({token: token}, args);
				resolve(promise);

				return promise;
			});
		});
	};

	const inject = function globals(scope, filter) {
		if (!scope) {
			throw new Error('scope is required');
		}

		// TODO allow filter.

		Object.keys(tool).forEach((space) => {
			scope[space] = scope[space] || {};

			Object.keys(tool[space]).forEach((name) => {
				scope[space][name] = rename(
					wrap(tool[space][name]),
					name
				);
			});
		});

		scope.queue = queue;
	};

	const globals = {
		tasty: {
			config: config,
			globals: inject,
			tool: tool,
			queue: queue
		}
	};

	config.globals &&
		inject(globals);

	return {
		globals: globals
	};
}

function find(name) {
	try {
		return require.resolve(name);
	} catch (thrown) {
		try {
			return require.resolve(process.cwd() + '/node_modules/' + name);
		} catch (thrown) {
			const path = require('requireg').resolve(name);
			if (!path) {
				throw new Error(`cannot find module '${name}'`);
			}

			return path;
		}
	}
}

function rename(fn, name) {
	Object.defineProperty(fn, 'name', {
		value: name,
		configurable: true
	});

	return fn;
}
