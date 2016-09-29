'use strict';

module.exports = {
	prepare: prepare,
	context: context
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
					bail: config.bail
					// TODO configurable reporter.
				});
			config.tests.forEach((file) => mocha.addFile(file));

			return {
				run: () => new Promise((resolve, reject) => {
					mocha.run((error) => {
						error ?
							reject(error) :
							resolve();
					});
				})
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
				showColors: config.colors
				// TODO configurable reporter.
			});

			return {
				run: () => new Promise((resolve, reject) => {
					jasmine.onComplete((passed) => {
						passed ?
							resolve() :
							reject(1); // TODO number of fails.
					});
					jasmine.execute();
				})
			};
		case 'qunit':
			const ctx = context(token, config),
				QUnit = require(
					find('qunitjs')
				);
			QUnit.config.autostart = false;
			ctx.globals.QUnit = QUnit;

			return {
				run: () => new Promise((resolve, reject) => {
					// TODO configurable reporter.
					QUnit.done((details) => {
						details.failed ?
							reject(details.failed) :
							resolve();
					});
					config.tests.map(
						(name) => sandbox.require(
							require.resolve(process.cwd() + '/' + name),
							ctx
						)
					);

					QUnit.load();
					QUnit.start();
				})
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
		queue.chain = [];

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

		if (config.assert) {
			let assert = require(
				find(config.assert)
			);
			scope.assert = assert.assert || assert;
		}
		if (config.expect) {
			let expect = require(
				find(config.expect)
			);
			scope.expect = expect.expect || expect;
		}
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
