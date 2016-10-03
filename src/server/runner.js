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
		log('client', token, 'runner', config.runner.name || 'custom', 'in', config.mode, 'mode');

		return config.runner;
	}
	log('client', token, 'runner', config.runner, 'in', config.mode, 'mode');
	config.slow &&
		log('client', token, 'slow', config.slow, 'ms');

	// WORKAROUND for internal state.
	Object.keys(require.cache).forEach(
		(key) => { delete require.cache[key]; }
	);

	switch (config.runner) {
		case 'mocha':
			const Mocha = sandbox.require(
					resolve('mocha'),
					context(token, config)
				),
				mocha = new Mocha({
					ui: 'bdd',
					bail: config.bail,
					reporter: config.reporter
				});
			config.tests.forEach((file) => mocha.addFile(file));

			return {
				run: () => new Promise((resolve, reject) => {
					mocha.run((error) => {
						error ?
							reject(error) :
							resolve();
					}).on(
						'test',
						(test) => tool.server.send(token, 'message', `test ${test.fullTitle()}`)
					);
				})
			};
		case 'jasmine':
			const Jasmine = sandbox.require(
					resolve('jasmine'),
					context(token, config)
				),
				jasmine = new Jasmine();
			jasmine.loadConfig({
				spec_files: config.tests
			});
			if (config.reporter) {
				const Reporter = require(
					resolve(config.reporter)
				);
				jasmine.configureDefaultReporter &&
					jasmine.configureDefaultReporter({
						print: () => {}
					});
				jasmine.env.clearReporters();
				jasmine.addReporter(
					new Reporter()
				);
			} else {
				jasmine.configureDefaultReporter &&
					jasmine.configureDefaultReporter({
						showColors: config.colors
					});
			}
			jasmine.addReporter({
				specStarted: (spec) => tool.server.send(token, 'message', `test ${spec.fullName}`)
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
					resolve('qunitjs')
				);

			// NOTE QUnit doesn't have built-in console reporter.
			// TODO nested modules and colors.
			// TODO separate into tasty-qunit-reporter module.
			let passed = 0,
				failed = 0,
				skipped = 0,
				errors = [];
			QUnit.moduleStart(
				(details) => {
					console.log();
					console.log(`  ${details.name}`);
				}
			);
			QUnit.testDone(
				(details) => {
					details.failed ?
						failed++ :
						details.passed ?
							passed++ :
							skipped++;
					console.log(`    ${details.failed ? '×' : details.passed ? '+' : '-'} ${details.name}${details.total ? ' (' + details.runtime + 'ms)' : ''}`);
				}
			);
			QUnit.log(
				(details) => details.result || errors.push(details)
			);
			QUnit.done(
				(details) => {
					console.log();
					console.log(`  ${passed} passed (${details.runtime}ms)`);
					failed &&
						console.log(`  ${failed} failed`);
					skipped &&
						console.log(`  ${skipped} skipped`);
					console.log();
					errors.forEach((details) => {
						console.log(`  ${details.name} ${details.module}`);
						console.log(`  ${details.message || (details.actual + ' is not ' + details.expected)}`);
						console.log(`${details.source}`);
						console.log();
					});
				}
			);

			QUnit.testStart(
				(details) => tool.server.send(token, 'message', `test ${details.module} ${details.name}`)
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
	const assert = config.assert ?
			require(resolve(config.assert)) :
			null,
		expect = config.expect ?
			require(resolve(config.expect)) :
			null;

	const queue = function queue(...links) {
		if (links.length) {
			queue.push(...links);
		} else {
			let chain = Promise.resolve();
			queue.chain.forEach((link) => {
				if (typeof link !== 'function') {
					throw new Error('push functions to queue');
				}
				chain = chain.then(link);
			});
			queue.chain = [];

			return chain;
		}
	};
	queue.chain = [];
	queue.push = (...links) => {
		config.slow &&
			queue.chain.push(() => new Promise(
				(resolve) => setTimeout(resolve, config.slow)
			));
		queue.chain.push(...links);
	}

	// NOTE support for for runner.get/set/pop/push/until/while.
	const wrap = (tool) => (...args) => new Promise(
		(resolve) => queue.push(
			() => tool.apply(token, args).then(resolve)
		)
	);

	const inject = function inject(from, to, enqueue) {
		if (!to) {
			throw new Error('scope is required');
		}

		Object.keys(from).forEach((space) => {
			to[space] = to[space] || {};

			Object.keys(from[space]).forEach((name) => {
				to[space][name] = enqueue ?
					rename(
						wrap(from[space][name]),
						name
					) :
					from[space][name];
			});
		});
	};

	const enqueued = function globals(scope) {
		// TODO filter.

		inject(tool, scope, true);
		scope.queue = queue;

		if (assert) {
			scope.assert = assert.assert || assert;
		}
		if (expect) {
			scope.expect = expect.expect || expect;
		}
	};

	inject(tool, queue, false);

	const globals = {
		tasty: {
			config: config,
			globals: enqueued,
			tool: tool,
			queue: queue
		}
	};

	config.globals &&
		enqueued(globals);

	return {
		globals: globals
	};
}

function resolve(name) {
	try {
		return require.resolve(name);
	} catch (thrown) {
		try {
			return require.resolve(process.cwd() + '/node_modules/' + name);
		} catch (thrown) {
			const path = require('requireg').resolve(name);
			if (!path) {
				throw new Error(`Cannot find module '${name}'`);
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
