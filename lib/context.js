'use strict';

const Tool = require('./tool'),
	thing = require('./thing'),
	util = require('./util');

/**
 * Context for Tasty test runners.
 * @constructor
 * @param {Tasty} tasty {@link #Tasty|Tasty} instance.
 * @param {Object} client Client instance.
 */
function Context(tasty, client) {
	const config = tasty.config,
		flaws = client.flaws,
		server = tasty.server,
		id = client.id;

	const tool = new Tool(id, server, config);

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

	const push = function() {
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
				util.rename(
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
					const module = require(util.resolve(name));
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
		console: server.logger,
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

function getContext() {
	return Context;
}

module.exports = {
	Context: Context,
	getContext: getContext,
}
