'use strict';

module.exports = createRunner;

const Emitter = require('events').EventEmitter,
	sandbox = require('tasty-sandbox');

const createTool = require('./tool'),
	util = require('./util');

const rename = util.rename,
	resolve = util.resolve;

class MochaRunner {
	constructor(context, files, config) {
		const Mocha = sandbox.require(
			resolve('mocha'),
			context
		);
		this.mocha = new Mocha({
			ui: config.ui || 'bdd',
			bail: config.bail,
			reporter: config.reporter || 'spec'
		});
		files.forEach(
			(file) => this.mocha.addFile(file)
		);
	}

	run() {
		return new Promise((resolve, reject) => {
			this.mocha.run((failed) => {
				if (failed) {
					const error = new Error(`${failed} failed`);
					error.code = failed;
					reject(error);
				} else {
					resolve();
				}
			})
				.on(
					'test',
					(test) => this.onTest(test.fullTitle())
				)
				.on(
					'pass',
					(test) => this.onPass(test.fullTitle())
				)
				.on(
					'fail',
					(test, error) => this.onFail(test.fullTitle(), error)
				)
		});
	}
}

class JasmineRunner {
	constructor(context, files, config) {
		const Jasmine = sandbox.require(
				resolve('jasmine'),
				context
			),
			jasmine = new Jasmine();
		jasmine.loadConfig({
			spec_files: files
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
			specStarted: (spec) => this.onTest(spec.fullName),
			specDone: (spec) => {
				if (spec.status === 'failed') {
					const fail = spec.failedExpectations[0],
						error = new Error(fail.message);
					error.stack = fail.stack;
					this.failed++;
					this.onFail(spec.fullName, error);
				} else {
					this.onPass(spec.fullName);
				}
			}
		});
		this.failed = 0;
		this.jasmine = jasmine;
	}

	run() {
		return new Promise((resolve, reject) => {
			this.jasmine.onComplete((passed) => {
				if (passed) {
					resolve();
				} else {
					const error = new Error(`${this.failed} failed`);
					error.code = this.failed;
					reject(error);
				}
			});
			this.jasmine.execute();
		});
	}
}

// TODO separate into tasty-qunit-reporter module?
// TODO nested modules and colors.
class QUnitConsoleReporter {
	constructor(instance) {
		let passed = 0,
			failed = 0,
			skipped = 0,
			errors = [];
		instance.moduleStart(
			(details) => {
				console.log();
				console.log(`  ${details.name}`);
			}
		);
		instance.testDone(
			(details) => {
				details.failed ?
					failed++ :
					details.passed ?
						passed++ :
						skipped++;
				console.log(`    ${details.failed ? '×' : details.passed ? '+' : '-'} ${details.name}${details.total ? ' (' + details.runtime + 'ms)' : ''}`);
			}
		);
		instance.log(
			(details) => details.result || errors.push(details)
		);
		instance.done(
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
	}
}

class QUnitRunner {
	constructor(context, files, config) {
		this.context = context;
		this.files = files;

		const QUnit = require(
			resolve('qunitjs')
		);

		// NOTE QUnit doesn't have built-in console reporter.
		new QUnitConsoleReporter(QUnit);

		QUnit.testStart(
			(details) => this.onTest(`${details.module} ${details.name}`)
		);
		QUnit.log(
			(details) => {
				const name = `${details.module} ${details.name}`;
				if (details.result) {
					this.onPass(name);
				} else {
					const error = new Error(details.message || `${details.actual} is not ${details.expected}`);
					error.stack = details.source;
					this.onFail(name, error);
				}
			}
		);
		QUnit.config.autostart = false;
		this.QUnit = QUnit;

		context.globals.QUnit = QUnit;
	}

	run() {
		return new Promise((resolve, reject) => {
			const QUnit = this.QUnit;

			// TODO configurable reporter.
			QUnit.done((details) => {
				if (details.failed) {
					const error = new Error(`${details.failed} failed`);
					error.code = details.failed;
					reject(error);
				} else {
					resolve();
				}
			});
			this.files.map(
				(file) => sandbox.require(
					require.resolve(process.cwd() + '/' + file),
					this.context
				)
			);

			QUnit.load();
			QUnit.start();
		});
	}
}

function createRunner(token, files, server, emitter, config) {
	// WORKAROUND for internal state.
	Object.keys(require.cache).forEach(
		(key) => { delete require.cache[key]; }
	);

	const context = createContext(token, server, config);

	let runner;
	switch (config.runner) {
		case 'mocha':
			runner = new MochaRunner(context, files, config);
			break;
		case 'jasmine':
			runner = new JasmineRunner(context, files, config);
			break;
		case 'qunit':
			runner = new QUnitRunner(context, files, config);
			break;
		default:
			// TODO support user-provided runner.
			throw new Error(`unknown runner '${config.runner}'`);
	}

	runner.onTest = (name) => emitter.emit('test', name);
	runner.onPass = (name) => emitter.emit('pass', name);
	runner.onFail = (name, error) => emitter.emit('fail', name, error);

	return runner;
}

function createContext(token, server, config) {
	const tool = createTool(token, server, config);

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
		(resolve, reject) => queue.push(
			() => tool.apply(token, args)
				.then(
					resolve,
					(error) => {
						reject(error);
						throw error;
					}
				)
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

		config.addon &&
			config.addon.split(',')
				.sort(
					(a, b) => a.localeCompare(b)
				)
				.forEach((name) => {
					const module = require(resolve(name));
					scope[name] = module;

					// NOTE support for assterion/expectation libraries.
					if (module.assert) {
						scope.assert = module.assert;
					}
					if (module.expect) {
						scope.expect = module.expect;
					}

					// WORKAROUND for chai plugins.
					/^chai-/.test(name) && scope.chai &&
						scope.chai.use(module);
				});
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
