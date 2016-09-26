'use strict';

const Emitter = require('events'),
	fs = require('fs'),
	glob = require('glob'),
	http = require('http'),
	https = require('https'),
	socketio = require('socket.io'),
	sandbox = require('tasty-sandbox'),
	url = require('url');

tasty.tool = tool;
tasty.listen = listen;

module.exports = tasty;

const SERVER = 'http://0.0.0.0:8765/',
	STATIC = 'http://0.0.0.0:5678/';

// TODO allow to filter globals.
let emitter = new Emitter(),
	config = tasty.config = {
		include: '',
		exclude: '',
		runner: 'mocha',
		globals: true,
		colors: true,
		bail: false,
		exit: true,
	},
	runners = {};

function tasty(conf) {
	Object.assign(config, conf);

	config.tests = config.include ?
		glob.sync(config.include, {ignore: config.exclude}) :
		[];
	config.server = config.server ?
		config.server === true ?
			url.parse(SERVER) :
			Object.assign(url.parse(SERVER), url.parse(config.server)) :
		url.parse(SERVER);
	config.static = config.static ?
		config.static === true ?
			url.parse(STATIC) :
			Object.assign(url.parse(STATIC), url.parse(config.static)) :
		null;

	return tasty;
}

function listen() {
	let server = http.createServer((request, response) => {
		switch (request.url) {
			case '/':
			case config.server.path:
				response.setHeader('Content-Type', 'text/plain');
				response.writeHead('400');
				response.end(`400 Bad Request\nLoad ${url.format(config.server)}tasty.js on your page.`);
				break;
			case config.server.path + 'tasty.js':
				response.setHeader('Content-Type', 'application/javascript');
				response.end(
					fs.readFileSync(__dirname + '/client.js')
				);
				break;
			case config.server.path + 'socket.io.js':
				response.setHeader('Content-Type', 'application/javascript');
				response.end(
					fs.readFileSync(__dirname + '/../node_modules/socket.io-client/socket.io.js')
				);
				break;
			default:
				response.setHeader('Content-Type', 'text/plain');
				response.writeHead('404');
				response.end('404 Not Found');
		}
	})
		.listen(
			config.server.port | 0,
			config.server.hostname === '0.0.0.0' ?
				null :
				config.server.hostname
		);

	log('server', url.format(config.server));

	tasty.io = socketio(server).path(config.server.path)
		.on('connection', (socket) => {
			socket.emit('ready', generate(), (key) => {
				// NOTE we use socket.io rooms to handle reconnects properly.

				key = key | 0;
				let runner = runners[key];
				if (runner) {
					emitter.emit('reconnect' + key);

					socket.join(key);
					runner.finish &&
						finish(key);

					return;
				}

				runner = runners[key] = prepare(key, config.tests);
				socket.join(key);
				log('client', key, 'ready');

				runner.run()
					.catch((error) => error)
					.then((error) => {
						log('client', key, error ? 'failure ' + error : 'success');

						runner.error = error;
						runner.finish = true;
						finish(key);
					});
			});
		});

	if (config.static) {
		log('static', url.format(config.static));

		tasty.static = http.createServer((request, response) => {
			try {
				let path = process.cwd() + request.url;
				if (fs.existsSync(path)) {
					response.end(
						fs.readFileSync(path)
					);
				} else {
					response.writeHead(404);
					response.end('404 Not Found');
				}
			} catch (thrown) {
				response.writeHead(500);
				response.end('500 ' + thrown);
			}
		})
			.listen(
				config.static.port | 0,
				config.static.hostname === '0.0.0.0' ?
					null :
					config.static.hostname
			);
	}

	config.tests.length ?
		log('tests', config.tests) :
		log('no tests found');

	return tasty;
}

function generate() {
	return generate.key = (generate.key | 0) + 1;
}

function prepare(key) {
	log('client', key, 'runner', config.runner);

	switch (config.runner) {
		case 'mocha':
			let Mocha = sandbox.require(
					resolve('mocha'),
					context(key, config.globals === true)
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
			let Jasmine = sandbox.require(
					resolve('jasmine'),
					context(key, config.globals === true)
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
			// TODO resolve plugin.
			throw new Error(`unknown runner '${config.runner}'`);
	}
}

function finish(key) {
	emit(key, 'finish', null)
		.then(() => null, (error) => error)
		.then((error) => {
			log('client', key, 'finished');

			config.exit === true &&
				process.exit(runners[key].error || error);
		});
}

function resolve(name) {
	try {
		return require.resolve(name);
	} catch (thrown) {
		try {
			return require.resolve(process.cwd() + '/node_modules/' + name);
		} catch (thrown) {
			let path = require('requireg').resolve(name);
			if (!path) {
				throw new Error(`cannot find module '${name}'`);
			}

			return path;
		}
	}
}

function context(key, auto) {
	let queue = function queue(done) {
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

	let wrap = function(tool) {
		return function(...args) {
			return new Promise(function(resolve) {
				queue.chain.push(function() {
					var promise = tool.apply({key: key}, args);
					resolve(promise);

					return promise;
				});
			});
		};
	};

	let inject = function globals(scope, filter) {
		if (!scope) {
			throw new Error('scope is required');
		}

		// TODO filter.
		Object.keys(tasty.tool).forEach((name) => {
			let tool = tasty.tool[name];

			scope[name] = rename(
				wrap(tool),
				name
			);
			scope[name].handle = rename(
				tool.bind(scope),
				name
			);
		});

		scope.queue = queue;
	};

	let globals = {
		tasty: {
			config: config, // TODO clone?
			globals: inject,
			tool: tool,
			queue: queue
		}
	};

	auto &&
		inject(globals);

	return {
		globals: globals
	};
}

function emit(key, name, data, reconnect) {
	// NOTE we use socket.io rooms to handle reconnects properly.

	return new Promise((resolve, reject) => {
		tasty.io.in(key).clients(function (error, ids) {
			ids.forEach((id) => {
				tasty.io.connected[id].emit(name, data, (response) => {
					let result = response[0],
						error = response[1];
					if (error) {
						error = Object.assign(new Error(), error);
						reconnect ?
							emitter.once('reconnect' + key, () => reject(error)) :
							reject(error);
					} else {
						reconnect ?
							emitter.once('reconnect' + key, () => resolve(result)) :
							resolve(result);
					}
				})
			});
		});
	});
}

function rename(fn, name) {
	Object.defineProperty(fn, 'name', {
		value: name,
		configurable: true
	});

	return fn;
}

function log(...args) {
	if (tasty.log === false) {
		return;
	}

	args = ['[tasty]'].concat(args);
	tasty.log ?
		tasty.log.apply(null, args) :
		console.log.apply(console, args);
}

function tool(name, handle) {
	return tasty.tool[name] = typeof handle === 'function' ?
		handle :
		function(...args) {
			return emit(this.key, 'tool', [name].concat(args), !!handle);
		};
}

tool('click');
tool('font');
tool('location');
tool('navigate', true);
tool('reload', true);
tool('loaded');
tool('text');
tool('title');
tool('until', function until(tool, ...args) {
	return new Promise(function(resolve) {
		var repeat = function() {
			tool.handle.apply(null, args)
				.then(
					resolve,
					() => setTimeout(repeat, 100)
				)
		};
		repeat();
	});
});
