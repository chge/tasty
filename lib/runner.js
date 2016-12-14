'use strict';

module.exports = createRunner;

const sandbox = require('tasty-sandbox');

const createTool = require('./tool'),
	util = require('./util');

const rename = util.rename,
	resolve = util.resolve;

class JasmineRunner {
	/**
	 * @private
	 */
	constructor(context, files, config) {
		const Jasmine = sandbox.require(
				resolve('jasmine'),
				context
			),
			jasmine = new Jasmine();
		jasmine.loadConfig({
			spec_files: files
		});
		if (config.runnerReporter) {
			const Reporter = require(
				resolve(config.runnerReporter)
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

class MochaRunner {
	/**
	 * @private
	 */
	constructor(context, files, config) {
		const Mocha = sandbox.require(
			resolve('mocha'),
			context
		);
		this.mocha = new Mocha({
			ui: config.ui || 'bdd',
			bail: config.bail,
			reporter: config.runnerReporter || 'spec'
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

/* eslint-disable no-console */
// TODO separate into tasty-qunit-reporter module?
// TODO nested modules and colors.
class QUnitConsoleReporter {
	/**
	 * @private
	 */
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
					console.log(`  ${details.module} ${details.name}`);
					console.log(`  ${details.message || (details.actual + ' is not ' + details.expected)}`);
					console.log(`${details.source}`);
					console.log();
				});
			}
		);
	}
}
/* eslint-enable */

class QUnitRunner {
	/**
	 * @private
	 */
	constructor(context, files) {
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

function createRunner(id, files, server, emitter, config, flaws) {
	flaws = flaws || {};

	// WORKAROUND for internal state.
	Object.keys(require.cache).forEach(
		(key) => { delete require.cache[key]; }
	);

	const context = createContext(id, server, config, flaws);

	let runner;
	switch (config.runner) {
		case 'jasmine':
			runner = new JasmineRunner(context, files, config);
			break;
		case 'mocha':
			runner = new MochaRunner(context, files, config);
			break;
		case 'qunit':
			runner = new QUnitRunner(context, files, config);
			break;
		default:
			// TODO support user-provided runner.
			throw new TypeError(`unknown runner '${config.runner}'`);
	}

	runner.onTest = (name) => emitter.emit('test', name);
	runner.onPass = (name) => emitter.emit('pass', name);
	runner.onFail = (name, error) => emitter.emit('fail', name, error);

	return runner;
}

function createContext(id, server, config, flaws) {
	const tool = createTool(id, server, config);

	/**
	 * Executes queue.
	 * @memberof tasty
	 * @method now
	 * @return {Promise}
	 * @example
it('types name into field', () => {
	click('Name');
	type('John Doe');

	return now();
});
	 * @example
it('works with async callbacks', (done) => {
	click('Name');
	type('John Doe');

	now().then(done, done.fail);
});
	 * @example
it('works with async functions', async () => {
	click('Name');
	type('John Doe');

	await now();
});
	 */
	/**
	 * Adds function(s) to execution queue.
	 * @memberof tasty
	 * @method now
	 * @param {...Function} functions Functions to add.
	 * @return {Function[]}
	 * @throws {TypeError}
	 * @example
it('chooses behavior', () => {
	now(
		() => now.text('Welcome back')
			.then(
				() => now.click('Log in'),
				() => now.click('Sign up')
			)
	);

	return now();
});
	 */
	const now = function now() {
		if (arguments.length) {
			now.push.apply(now, [].slice.apply(arguments));
		} else {
			let chain = Promise.resolve();
			now.queue.forEach((link) => {
				if (typeof link !== 'function') {
					throw new TypeError('pass functions to now()');
				}
				chain = chain.then(link);
			});
			now.queue = [];

			return chain;
		}
	};
	now.queue = [];
	now.push = function push() {
		config.slow &&
			now.queue.push(() => new Promise(
				(resolve) => setTimeout(resolve, config.slow)
			));
		now.queue.push.apply(now.queue, [].slice.apply(arguments));
	}

	// NOTE support for for runner.get/set/pop/push/until/while.
	const wrap = (handle) => {
		const tool = function() {
			return new Promise(
				(resolve) => now.push(
					() => handle.apply(id, arguments)
						.then(
							resolve,
							(error) => {
								resolve(error);
								throw error;
							}
						)
				)
			);
		};
		tool.handle = handle;

		return tool;
	};

	const inject = function inject(from, to, enqueue) {
		if (!to) {
			throw new TypeError('scope is required');
		}

		Object.keys(from).forEach((name) => {
			to[name] = enqueue ?
				rename(
					wrap(from[name]),
					name
				) :
				from[name];
		});
	};

	/**
	 * Injects Tasty API into given `scope`. Called automatically with `global` if {@link /tasty/?api=server#new-Tasty|`config.globals`} is `true`.
	 * @memberof tasty
	 * @method api
	 * @param {Object} scope Scope to inject API into.
	 * @throws {TypeError}
	 * @example tasty.api(this);
	 */
	const api = function api(scope) {
		// TODO filter.

		inject(tool, scope, true);
		scope.now = now;

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
					// TODO support should();

					// WORKAROUND for chai plugins.
					/^chai-/.test(name) && scope.chai &&
						scope.chai.use(module);
				});
	};

	inject(tool, now, false);

	const globals = {
		/**
		 * Test API available in runner environment.
		 * @global
		 * @member {Object} tasty
		 */
		tasty: {
			api: api,
			/**
			 * Server config.
			 * @memberof tasty
			 * @member {Object} config
			 * @readonly
			 * @see {@link /tasty/?api=server#new-Tasty|Tasty}
			 */
			config: config,
			/**
			 * Client flaws.
			 * @memberof tasty
			 * @member {Object} flaws
			 * @see {@link /tasty/?api=client#tasty.flaws|tasty.flaws}
			 */
			flaws: flaws,
			now: now,
			tool: tool
		}
	};

	config.globals &&
		api(globals);

	return {
		globals: globals
	};
}
