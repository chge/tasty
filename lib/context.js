'use strict';

const Tool = require('./tool'),
	thing = require('./thing'),
	util = require('./util'),
	instance = util.instance;

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

	/**
	 * @method tool
	 * @param {string} path
	 * @param {Function} [handle]
	 * @returns {Function}
	 * @throws {TypeError}
	 */
	const tool = new Tool(id, server, config);

	/**
	 * Does nothing.
	 * @function noop
	 * @tool
	 * @example
now(
	() => now.is(node('dialog[open]')
		.then(
			() => click('Yes'),
			noop
		)
);
	 */
	const noop = function noop() {};

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
			enqueue.apply(
				null,
				Array.prototype.map.call(arguments, (item) => {
					if (!instance(item, Function)) {
						throw new TypeError('pass functions to now()');
					}

					return item;
				})
			);
		} else {
			const queue = now.queue;
			now.queue = [];

			return queue.reduce(
				(chain, item) => chain.then(item),
				Promise.resolve()
			);
		}
	};
	now.noop = noop;
	now.queue = [];

	const enqueue = function() {
		config.slow &&
			now.queue.push(() => new Promise(
				(resolve) => setTimeout(resolve, config.slow)
			));
		now.queue.push.apply(now.queue, arguments);
	}

	// NOTE support for get/set/pop/push/during/until.
	const wrap = (handle) => {
		const wrapped = function() {
			return new Promise(
				(resolve) => enqueue(
					() => {
						const result = handle.apply(id, arguments);
						if (!instance(result, Promise)) {
							throw new Error(`${handle.name}() should return promise`);
						}

						return result.then(
							resolve,
							(error) => {
								resolve(error);

								throw error;
							}
						);
					}
				)
			);
		};
		wrapped.handle = handle;

		return wrapped;
	};

	const inject = function inject(from, to, wrapped) {
		Object.keys(from).forEach((name) => {
			to[name] = wrapped ?
				util.rename(
					wrap(from[name]),
					name
				) :
				from[name];
		});
	};

	/**
	 * Injects Tasty API into given `scope`. Called automatically with `global` if {@link /tasty/?api=server#Tasty|`config.globals`} is `true`.
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
		scope.noop = noop;
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
		 * @member {Object} tasty
		 */
		tasty: {
			api: api,
			/**
			 * Server config.
			 * @memberof tasty
			 * @member {Object} config
			 * @readonly
			 * @see {@link /tasty/?api=server#Tasty|Tasty}
			 */
			config: config,
			/**
			 * Client flaws.
			 * @memberof tasty
			 * @member {Object} flaws
			 * @see {@link /tasty/?api=client#Tasty#flaws|Tasty#flaws}
			 */
			flaws: flaws,
			now: now,
			thing: thing,
			tool: tool,
			wrap: wrap
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
