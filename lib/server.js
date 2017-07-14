'use strict';

const createHttp = require('http').createServer,
	createHttps = require('https').createServer,
	EngineIO = require('engine.io'),
	fs = require('fs'),
	parseUrl = require('url').parse,
	parseAgent = require('platform').parse,
	resolvePath = require('path').resolve,
	util = require('./util');

const delay = util.delay,
	mime = util.mime,
	parseJson = util.parseJson,
	readFile = util.readFile;

/**
 * Tasty server implementation.
 */
class Server {
	/**
	 * @member {Object} clients Client index.
	 * @memberof Server.prototype
	 * @readonly
	 */

	/**
	 * @param {Tasty} tasty {@link #Tasty|Tasty} instance.
	 */
	constructor(tasty) {
		if (!this) {
			return new Server(tasty);
		}

		this.clients = {
			id: 0
		};
		this.tasty = tasty;
		this.config = tasty.config;
		this.emitter = tasty.emitter;
		this.logger = tasty.logger;
		this.scripts = {
			id: 0
		};
		this.sockets = [];
		this.version = 'Tasty ' + tasty.version;
	}

	listen() {
		return new Promise((resolve, reject) => {
			const config = this.config;

			Promise.all([
				config.cert ?
					readFile(config.cert) :
					null,
				config.key ?
					readFile(config.key) :
					null
			]).then((credentials) => {
				const cert = credentials[0],
					key = credentials[1],
					passphrase = config.passphrase;

				this.coverage = this.coverage ||
					this.tasty.Coverage ?
						new this.tasty.Coverage(this.tasty) :
						null;

				if (config.url.protocol === 'https:') {
					if (!cert) {
						return reject(
							config.cert ?
								new Error('invalid cert ' + config.cert) :
								new Error('cert is required')
						);
					}
					if (!key) {
						return reject(
							config.key ?
								new Error('invalid key ' + config.key) :
								new Error('key is required')
						);
					}
					this.http = createHttps({
						cert: cert,
						key: key,
						passphrase: passphrase
					});
				} else {
					this.http = createHttp();
				}
				this.http.listen(
					(config.url.port | 0) || 80,
					config.url.hostname === '0.0.0.0' ?
						null :
						config.url.hostname
				)
					.once('listening', () => {
						this.onListening();
						resolve();
					})
					.on('connection', this.onSocket.bind(this))
					.on('request', this.onRequest.bind(this))
					.on('upgrade', this.onUpgrade.bind(this))
					.on('error', (error) => {
						this.onError(error);
						reject(error);
					});

				const eio = new EngineIO.Server()
					.on('connection', this.onConnection.bind(this))
					.on('error', (error) => {
						this.logger.error('tasty', 'server', error);
						reject(error);
					});
				eio.generateId = this.onHandshake.bind(this);
				this.eio = eio;
			}, reject);
		});
	}

	close() {
		return new Promise((resolve, reject) => {
			if (!this.http) {
				return reject(
					new Error('server is not listening')
				);
			}

			this.http.close((error) => {
				error ?
					this.logger.warn('tasty', 'server', 'stopped', error) :
					this.logger.log('tasty', 'server', 'stopped');
				resolve();
			});

			Object.keys(this.eio.clients)
				.forEach(
					(id) => this.eio.clients[id].close()
				);

			this.sockets.forEach(
				(socket) => socket.destroyed ||
					socket.destroy()
			);

			this.emitter.removeAllListeners();
		});
	}

	start(id) {
		const config = this.config,
			client = this.clients[id],
			log = this.logger.log;

		let runner = client.runner;
		if (!runner) {
			runner = this.assignRunner(client);
		} else if (runner.ended) {
			return runner.ended;
		}

		return Promise.resolve()
			.then(() => {
				const urls = this.scripts[id];

				return urls ?
					urls.reduce(
						(chain, url) => chain.then(
							() => this.send(id, 'exec', url.slice(1))
						),
						Promise.resolve()
					) :
					null;
			})
			.then(() => {
				if (runner.running) {
					this.emitter.emit(id + '.reconnect');
				} else {
					if (this.coverage && config.coverageReporter) {
						this.emitter.on(id + '.coverage', (data) => {
							this.logger.debug('tasty', 'client', id, 'coverage');

							this.coverage.collect(data)
								.catch(
									(error) => this.logger.error('tasty', 'client', id, error)
								);
						});
					}

					/**
					 * Client is about to start testing.
					 * @event Tasty#start
					 * @param {number} id Client ID.
					 * @param {Runner} runner {@link #Runner|Runner} instance.
					 */
					this.emitter.emit('start', id, runner);

					runner.running = true;
					runner.run()
						.then(
							() => {
								log('tasty', 'client', id, 'success');
							},
							(error) => {
								log('tasty', 'client', id, 'failure', error && error.stack ? error.stack : error);

								runner.error = error;
							}
						)
						.then(
							() => this.end(id, config)
						);
				}
			});
	}

	send(id, type, data) {
		return new Promise((resolve, reject) => {
			const client = this.clients[id],
				mid = ++client.mid,
				reconnect = id + '.reconnect',
				key = id + '.' + mid;

			const onResponse = (response) => {
				this.emitter.removeListener(reconnect, onReconnect);

				let error = response[1],
					result = response[0];
				error ?
					reject(
						Object.assign(new Error(), error)
					) :
					resolve(result);
			};
			const onReconnect = () => {
				this.emitter.removeListener(key, onResponse);

				resolve();
			};

			this.emitter
				.once(key, onResponse)
				.once(reconnect, onReconnect);

			client.send(JSON.stringify([mid, type, data]));
		});
	}

	exec(id, code, args, persistent) {
		let scripts = this.scripts,
			sid = ++scripts.id,
			path = '/exec.' + id + '.' + sid + '.js',
			values = JSON.stringify(args || []);

		if (persistent) {
			scripts[id] = scripts[id] || [];
			scripts[id].push(path);
		}
		scripts[path] = `(${code}).apply(this,${values});`;

		return this.send(id, 'exec', path.slice(1))
			.then((result) => {
				if (!persistent && !this.config.verbose) {
					delete scripts[path];
				}

				return result;
			});
	}

	end(id) {
		const config = this.config,
			client = this.clients[id],
			runner = client.runner,
			// TODO timeout.
			promise = Promise.resolve()
				.then(() => {
					if (this.coverage && config.coverageReporter) {
						this.logger.log('tasty', 'client', id, 'coverage', config.coverageReporter);

						return this.send(id, 'coverage')
							.then(
								(data) => this.coverage.collect(data)
							)
							.then(
								() => this.coverage.report()
							)
							.catch(
								(error) => this.logger.error('tasty', error)
							);
					}
				})
				.then(
					() => Promise.race([
						// TODO send status for convenience.
						this.send(id, 'end'),
						delay(2000)
					])
				)
				.then(
					() => null,
					(error) => error
				)
				.then((error) => {
					this.logger.log('tasty', 'client', id, 'ended');

					this.emitter.removeAllListeners(id + '.coverage');
					this.emitter.removeAllListeners(id + '.reconnect');

					/**
					 * Client just ended testing.
					 * @event Tasty#end
					 * @param {number} id Client ID.
					 * @param {Error} [error] Error, if any.
					 */
					this.emitter.emit('end', id, runner ? runner.error || error : error);

					this.deleteClient(id);
				});
		if (runner) {
			runner.ended = promise;
		}

		return promise;
	}

	assignRunner(client) {
		const id = client.id;

		const runner = new this.tasty.Runner(this.tasty, client);
		runner.id = id;
		runner.onTest = (name) => {
			/**
			 * Client is about to run a test.
			 * @event Tasty#test
			 * @param {number} id Client ID.
			 * @param {string} name Test name.
			 */
			this.emitter.emit('test', id, name);
			this.send(id, 'message', name);
		};
		runner.onPass = (name) => {
			/**
			 * Client just passed a test.
			 * @event Tasty#pass
			 * @param {number} id Client ID.
			 * @param {string} name Test name.
			 */
			this.emitter.emit('pass', id, name);
		};
		runner.onFail = (name, error) => {
			/**
			 * Client just failed a test.
			 * @event Tasty#fail
			 * @param {number} id Client ID.
			 * @param {string} name Test name.
			 * @param {Error} error Error.
			 */
			this.emitter.emit('fail', id, name, error);
			this.send(id, 'message', 'fail');
		};
		client.runner = runner;

		return runner;
	}

	deleteClient(id) {
		this.deleteScripts(id);

		delete this.clients[id];
	}

	deleteScripts(id) {
		delete this.scripts[id];
	}

	onListening() {
		const config = this.config,
			log = this.logger.log;
		if (config.url.hostname === '0.0.0.0') {
			log('tasty', 'server', config.url.href.replace('0.0.0.0', 'localhost'));
			log('tasty', 'server', 'any host');
		} else {
			log('tasty', 'server', config.url.href);
		}
		config.static &&
			log('tasty', 'static', 'root', config.static);
		config.staticIndex &&
			log('tasty', 'static', 'index', config.staticIndex);
		config.coverage &&
			log('tasty', 'static', 'coverage', config.coverage);

		this.emitter.emit('listening', config.url.href, config.static, config.coverage);
	}

	onSocket(socket) {
		this.sockets.push(socket);
	}

	onRequest(request, response) {
		try {
			this.logger.debug('tasty', 'server', request.method, request.headers.host || '(no host)', request.url);

			const config = this.config,
				url = request.url,
				parsed = parseUrl(url, true),
				path = parsed.pathname;
			if (path === config.url.path) {
				if (parsed.query.EIO) {
					response.setHeader('Access-Control-Allow-Origin', '*');
					this.eio.handleRequest(request, response);
				} else if (config.static) {
					this.serveStatic(request, response);
				} else {
					this.serveForbidden(url, path, response);
				}
			} else if (path === config.url.path + 'tasty.js') {
				this.logger.debug('tasty', 'server', 'script', url);

				this.serveFile(url, __dirname + '/../dist/tasty.js', response);
			} else if (this.scripts[path]) {
				this.serveScript(path, response);
			} else if (config.static) {
				this.serveStatic(request, response);
			} else {
				this.serveNotFound(url, null, response);
			}
		} catch (thrown) {
			this.serveError(thrown, response);
		}
	}

	onUpgrade(request, socket, head) {
		this.eio.handleUpgrade(request, socket, head);
	}

	onHandshake(request) {
		// TODO validate id.
		let query = parseUrl(request.url, true).query,
			id = query.id;
		if (id) {
			const client = this.clients[id];
			// NOTE this call is synchronous.
			client &&
				client.close();

			return id;
		}

		return ++this.clients.id;
	}

	onConnection(client) {
		const id = client.id,
			logger = this.logger,
			old = this.clients[id] || false,
			request = client.request;

		// NOTE old client should be already closed.
		this.clients[id] = client;
		client.flaws = old.flaws || {};
		client.mid = old.mid | 0;
		client.name = old.name || '';
		client.runner = old.runner;

		if (!old) {
			const name = request.headers['user-agent'],
				agent = parseAgent(name),
				browser = agent.version ?
					agent.name + ' ' + agent.version :
					'Unknown ' + agent.layout,
				os = [agent.os.family, agent.os.version, 'x' + agent.os.architecture].join(' '),
				query = parseUrl(request.url, true).query,
				flaws = query.flaws;
			logger.log('tasty', 'client', id, browser, 'on', os);
			util.describeFlaws(flaws).forEach(
				(description) => old ||
					logger.warn('tasty', 'client', id, description)
			);
			client.flaws = util.parseFlaws(flaws);
			client.name = name;
		}

		client
			.on('error', (error) => this.onError(error))
			.on('message', (raw) => this.onMessage(client, raw));

		this.start(id)
			.catch(
				(error) => this.onError(error)
			);
	}

	onMessage(client, raw) {
		const id = client.id,
			message = parseJson(raw);

		if (message instanceof Error) {
			this.logger.warn('tasty', 'client', id, message);
		} else {
			const mid = message[0],
				type = message[1],
				data = message[2];

			this.emitter.emit(
				mid ?
					id + '.' + mid :
					id + '.' + type,
				data
			);
		}
	}

	onError(error) {
		this.logger.error('tasty', 'server', error);

		/**
		 * Unexpected error.
		 * @event Tasty#error
		 * @param {Error} error Error.
		 */
		this.emitter.emit('error', error);
	}

	serveScript(path, response) {
		this.logger.debug('tasty', 'server', 'script', path);

		// NOTE no considerable sources to instrument.
		response.setHeader('Server', this.version);
		response.setHeader('Content-Type', mime.js);
		response.end(
			this.scripts[path]
		);
	}

	serveStatic(request, response) {
		const config = this.config,
			url = request.url,
			pathname = parseUrl(url).pathname,
			path = pathname === '/' && config.staticIndex ?
				config.staticIndex :
				resolvePath(
					config.static + pathname
				);

		// TODO configurable index?
		fs.access(path, fs.R_OK, (error) => {
			if (error) {
				return error.code === 'ENOENT' ?
					config.staticIndex ?
						this.serveFile(url, config.staticIndex, response) :
						this.serveNotFound(url, path, response) :
					this.serveForbidden(url, path, response);
			}

			if (this.coverage && mime(path) === mime.js) {
				this.serveInstrumented(url, path, response);
			} else {
				this.logger.debug('tasty', 'static', 200, url, 'from', path || '(invalid path)');

				this.serveFile(url, path, response);
			}
		});
	}

	serveInstrumented(url, path, response) {
		try {
			readFile(path)
				.then(
					(content) => this.coverage.instrument(content.toString(), path)
				)
				.then(
					(instrumented) => {
						this.logger.debug('tasty', 'static', 200, url, 'coverage', path);

						response.setHeader('Server', this.version);
						response.setHeader('Content-Type', mime.js);
						response.end(instrumented);
					},
					(error) => {
						this.serveJsError(url, error, response);
					}
				);
		} catch (thrown) {
			this.serveJsError(url, thrown, response);
		}
	}

	serveJsError(url, error, response) {
		this.logger.debug('tasty', 'static', 200, url, error);

		response.setHeader('Server', this.version);
		response.setHeader('Content-Type', mime.js);
		response.end(`
(function() {
	var error = new Error(${JSON.stringify(error.message)});
	error.name = ${JSON.stringify(url)};
	throw error;
/*
${error.stack}
*/
})();
`
		);
	}

	serveFile(url, path, response) {
		const config = this.config,
			type = mime(path),
			onError = (error) => error.code === 'EISDIR' ?
				this.serveForbidden(url, path, response) :
				this.serveError(error, response);

		response.setHeader('Server', this.version);
		response.setHeader('Content-Type', type);
		if (type === mime.html && (config.coverage === 'istanbul' || config.coverage === 'nyc')) {
			readFile(path)
				.then(
					// WORKAROUND: Istanbul and NYC use eval to get top-level scope.
					(content) => response.end(
						content.toString()
							.replace('script-src ', "script-src 'unsafe-eval' ")
					),
					onError
				);
		} else {
			fs.createReadStream(path)
				.on('error', onError)
				.pipe(response);
		}
	}

	serveBadRequest(url, response) {
		this.logger.debug('tasty', 'server', 400, url);

		response.setHeader('Server', this.version);
		response.setHeader('Content-Type', mime.txt);
		response.writeHead('400');
		response.end(`400 Bad Request\n\nLoad ${this.config.url.href}tasty.js on your page.`);
	}

	serveForbidden(url, path, response) {
		this.logger.debug('tasty', 'server', 403, url, 'as', path);

		response.setHeader('Server', this.version);
		response.setHeader('Content-Type', mime.txt);
		response.writeHead(403);
		response.end('403 Forbidden');
	}

	serveNotFound(url, path, response) {
		this.logger.debug('tasty', 'server', 404, url, 'as', path);

		response.setHeader('Server', this.version);
		response.setHeader('Content-Type', mime.txt);
		response.writeHead(404);
		response.end('404 Not Found');
	}

	serveError(error, response) {
		this.logger.debug('tasty', 'server', 500, error);

		if (!response.headersSent) {
			response.setHeader('Server', this.version);
			response.setHeader('Content-Type', mime.txt);
			response.writeHead(500);
		}
		response.end('500 Internal Server Error\n\n' + (error ? error.stack || error : error));
	}
}

function getServer() {
	return Server;
}

module.exports = {
	Server: Server,
	getServer: getServer
};
