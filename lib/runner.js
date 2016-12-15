'use strict';

module.exports = createRunner;

const sandbox = require('tasty-sandbox');

const createTool = require('./tool'),
	thing = require('./thing'),
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
			// TODO sandbox.
			// NOTE sandbox breaks some Jasmine reporters.
			let Reporter = require(
				resolve(config.runnerReporter)
			);

			// WORKAROUND
			Reporter = typeof Reporter === 'function' ?
				Reporter :
				Reporter[Object.keys(Reporter)[0]];

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
	constructor(instance, console) {
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

		const QUnit = sandbox.require(
			resolve('qunitjs'),
			context
		);

		// NOTE QUnit doesn't have built-in console reporter.
		new QUnitConsoleReporter(QUnit, context.globals.console);

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

function createRunner(id, files, server, config, flaws) {
	flaws = flaws || {};

	// WORKAROUND for internal state.
	Object.keys(require.cache).forEach(
		(key) => { delete require.cache[key]; }
	);

	const context = createContext(id, server, config, flaws);

	switch (config.runner) {
		case 'jasmine':
			return new JasmineRunner(context, files, config);
		case 'mocha':
			return new MochaRunner(context, files, config);
		case 'qunit':
			return new QUnitRunner(context, files, config);
		default:
			// TODO support user-provided runner.
			throw new TypeError(`unknown runner '${config.runner}'`);
	}
}

function createContext(id, server, config, flaws) {
	const tool = createTool(id, server, config);

	/**
	 * Executes queue.
	 * @method now
	 * @returns {Promise}
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
	 * @method now
	 * @param {...Function} functions Functions to add.
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
			push.apply(null, [].slice.apply(arguments));
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

	function push() {
		config.slow &&
			now.queue.push(() => new Promise(
				(resolve) => setTimeout(resolve, config.slow)
			));
		now.queue.push.apply(now.queue, [].slice.apply(arguments));
	}

	// NOTE support for get/set/pop/push/during/until.
	const wrap = (handle) => {
		const wrapped = function() {
			return new Promise(
				(resolve) => push(
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
		wrapped.handle = handle;

		return wrapped;
	};

	const inject = function inject(from, to, enqueue) {
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
	 * @returns {Object} Passed `scope` for chaining.
	 * @throws {TypeError}
	 * @example tasty.api(this);
	 */
	const api = function api(scope) {
		if (!scope) {
			throw new TypeError('api, scope is required');
		}

		// TODO filter.

		inject(tool, scope, true);
		inject(thing, scope, false);
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

		return scope;
	};

	inject(tool, now, false);

	const globals = {
		console: server.log,
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
			thing: thing,
			tool: tool
		}
	};

	config.globals &&
		api(globals);

	return {
		globals: globals
	};
}
