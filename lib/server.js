'use strict';

const createHttp = require('http').createServer,
	createHttps = require('https').createServer,
	debug = require('debug')('tasty:server'),
	fs = require('fs'),
	parseUrl = require('url').parse,
	parseAgent = require('platform').parse,
	resolvePath = require('path').resolve,
	wsServer = require('ws').Server,
	util = require('./util');

const delay = util.delay,
	formatCsp = util.formatCsp,
	mime = util.mime,
	parseCsp = util.parseCsp,
	parseJson = util.parseJson,
	readFile = util.readFile;

/**
 * Tasty server implementation.
 */
class Server {
	/**
	 * Client index.
	 * @name Server#clients
	 * @type {Object}
	 * @readonly
	 * @see {@link https://github.com/websockets/ws/blob/HEAD/doc/ws.md#class-websocket|ws.WebSocket}
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

				let http;
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
					http = createHttps({
						cert: cert,
						key: key,
						passphrase: passphrase
					});
				} else {
					http = createHttp();
				}
				http.listen(
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
					.on('error', (error) => {
						this.onError(error);
						reject(error);
					});

				const ws = new wsServer({server: http})
					.on('connection', this.onConnection.bind(this))
					.on('error', (error) => {
						this.onError(error);
						reject(error);
					});

				this.http = http;
				this.ws = ws;
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

			this.sockets.forEach(
				(socket) => socket && !socket.destroyed &&
					socket.destroy()
			);

			this.emitter.removeAllListeners();
		});
	}

	connect(id) {
		const client = this.clients[id];

		return Promise.resolve()
			/**
			 * Client is about to connect.
			 * @event Tasty#start
			 * @param {number} id Client ID.
			 * @param {Object} client Client instance.
			 */
			.then(
				() => this.emitter.emit('connect', id, client)
			)
			.then(() => {
				const urls = this.scripts[id];

				return urls ?
					urls.reduce(
						(chain, path) => chain.then(
							() => this.send(id, 'exec', path)
						),
						Promise.resolve()
					) :
					null;
			})
			.then(
				() => this.send(id, 'connect', Object.assign({id: id}, client.config))
			)
			.then(
				() => this.emitter.emit(id + '.connect')
			);
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
		if (runner.running) {
			return Promise.resolve();
		}

		if (this.coverage && config.coverageReporter) {
			this.emitter.on(id + '.coverage', (data) => {
				debug('client', id, 'coverage');

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

		return Promise.resolve();
	}

	send(id, type, data) {
		return new Promise((resolve, reject) => {
			const client = this.clients[id],
				mid = ++client.mid,
				connect = id + '.connect',
				key = id + '.' + mid;

			this.sendRaw(client, mid, type, data)
				.then(() => {
					const onResponse = (response) => {
						this.emitter.removeListener(connect, onConnect);

						const error = response[1],
							result = response[0];
						error ?
							reject(
								Object.assign(new Error(), error)
							) :
							resolve(result);
					};
					const onConnect = () => {
						this.emitter.removeListener(key, onResponse);

						resolve();
					};

					this.emitter
						.once(key, onResponse)
						.once(connect, onConnect);
				}, reject);
		});
	}

	sendRaw(client, mid, type, data) {
		return new Promise((resolve) => {
			client.send(
				JSON.stringify([mid, type, data]),
				resolve
			);
		});
	}

	exec(id, code, args, persistent) {
		const scripts = this.scripts,
			sid = ++scripts.id,
			path = [
				this.config.url.path,
				'tasty.exec.', id, '.', sid, '.js'
			].join('');

		if (persistent) {
			scripts[id] = scripts[id] || [];
			scripts[id].push(path);
		}
		scripts[path] = util.formatExec(path, code, args);

		return this.send(id, 'exec', path)
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

					this.emitter.removeAllListeners(id + '.connect');
					this.emitter.removeAllListeners(id + '.coverage');

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
			this.send(id, 'log', name);
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
			this.send(id, 'log', 'fail ' + error);
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
		const sockets = this.sockets,
			index = sockets.push(socket) - 1;
		socket.once('close', () => {
			sockets[index] = null;
		});
	}

	onRequest(request, response) {
		try {
			const config = this.config,
				url = request.url,
				parsed = parseUrl(url, true),
				path = parsed.pathname;
			if (path === config.url.path) {
				if (config.static) {
					this.serveStatic(request, response);
				} else {
					this.serveBadRequest(request, response);
				}
			} else if (path === config.url.path + 'tasty.js') {
				debug(200, request.method, url);
				this.serveFile(url, __dirname + '/../dist/tasty.js', request, response);
			} else if (path === config.url.path + 'tasty.min.js') {
				debug(200, request.method, url);
				this.serveFile(url, __dirname + '/../dist/tasty.min.js', request, response);
			} else if (this.scripts[path]) {
				this.serveScript(path, request, response);
			} else if (config.static) {
				this.serveStatic(request, response);
			} else {
				this.serveNotFound(url, null, request, response);
			}
		} catch (thrown) {
			this.serveError(thrown, request, response);
		}
	}

	onConnection(client, request) {
		const query = parseUrl(request.url, true).query,
			id = query.id ||
				++this.clients.id,
			logger = this.logger,
			old = this.clients[id] || false;

		// NOTE old client should be already closed.
		client.config = {};
		client.flaws = old.flaws || {};
		client.id = id;
		client.mid = old.mid | 0;
		client.name = old.name || '';
		client.runner = old.runner;

		if (old) {
			old.close();
		} else {
			const name = request.headers['user-agent'],
				agent = parseAgent(name),
				browser = agent.version ?
					agent.name + ' ' + agent.version :
					'Unknown ' + agent.layout,
				os = [agent.os.family, agent.os.version, 'x' + agent.os.architecture].join(' '),
				flaws = query.flaws;
			logger.log('tasty', 'client', id, browser, 'on', os);
			util.describeFlaws(flaws).forEach(
				(description) => logger.warn('tasty', 'client', id, description)
			);
			client.flaws = util.parseFlaws(flaws);
			client.name = name;
		}

		client
			.on('message', (raw) => this.onMessage(client, raw))
			.on('error', (error) => debug('client', id, error));

		this.clients[id] = client;

		this.connect(id)
			.then(
				() => this.start(id)
			)
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

			if (type === 'ack') {
				this.sendRaw(client, mid, 'ack')
					.catch(
						(error) => this.onError(error)
					)
			} else {
				this.emitter.emit(
					mid ?
						id + '.' + mid :
						id + '.' + type,
					data
				);
			}
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

	patchHtml(content, request) {
		content = content.toString();
		const config = this.config,
			href = config.url.hostname === '0.0.0.0' ?
				config.url.href.replace(config.url.host, request.headers.host) :
				config.url.href,
			embed = config.embed ?
				config.embed === 'min' ?
					'tasty.min.js' :
					'tasty.js' :
				null;

		if (embed) {
			// TODO parse HTML.
			content = content.replace(/<head>/i, `<head><script src="${href}${embed}"></script>`);
		}

		// WORKAROUND: we can try to modify CSP only if it's in meta tag.
		// TODO parse HTML.
		let found = /<meta[^>]+content-security-policy/i.exec(content);
		found = found ?
			/content\s?=\s?"([^"]+)"/i.exec(
				content.substr(found.index)
			) :
			null;
		if (!found || !found[1]) {
			return content;
		}

		const parsed = parseCsp(found[1]);
		if (parsed['connect-src']) {
			parsed['connect-src'].push(href.replace(/^http/, 'ws'));
		} else if (parsed['default-src']) {
			parsed['default-src'].push(href.replace(/^http/, 'ws'));
		}
		if (embed) {
			if (parsed['script-src']) {
				parsed['script-src'].push(href + embed);
			} else if (parsed['default-src']) {
				parsed['default-src'].push(href + embed);
			}
		}

		// WORKAROUND: Istanbul and NYC use eval to get top-level scope.
		if (config.coverage === 'istanbul' || config.coverage === 'nyc') {
			if (parsed['script-src']) {
				parsed['script-src'].indexOf("'unsafe-eval'") === -1 &&
					parsed['script-src'].push("'unsafe-eval'");
			} else if (parsed['default-src']) {
				// NOTE don't add over-restricted script-src directive.
				parsed['script-src'] = parsed['default-src']
					.concat("'unsafe-eval'");
			}
		}

		return content.replace(
			found[1],
			formatCsp({
				directives: parsed
			})
		);
	}

	serveScript(path, request, response) {
		debug(200, request.method, path);

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
			path = pathname === config.url.path && config.staticIndex ?
				config.staticIndex :
				resolvePath(
					config.static + pathname
				);

		fs.access(path, fs.R_OK, (error) => {
			if (error) {
				return error.code === 'ENOENT' ?
					config.staticIndex ?
						this.serveFile(url, config.staticIndex, request, response) :
						this.serveNotFound(url, path, request, response) :
					pathname === config.url.path ?
						this.serveBadRequest(request, response) :
						this.serveForbidden(url, path, request, response);
			}

			if (this.coverage && mime(path) === mime.js) {
				this.serveInstrumented(url, path, request, response);
			} else {
				this.serveFile(url, path, request, response);
			}
		});
	}

	serveInstrumented(url, path, request, response) {
		try {
			readFile(path)
				.then(
					(content) => this.coverage.instrument(content.toString(), path)
				)
				.then(
					(instrumented) => {
						debug(200, request.method, url, 'coverage', path);

						response.setHeader('Server', this.version);
						response.setHeader('Content-Type', mime.js);
						response.end(instrumented);
					},
					(error) => {
						this.serveJsError(url, error, request, response);
					}
				);
		} catch (thrown) {
			this.serveJsError(url, thrown, request, response);
		}
	}

	serveJsError(url, error, request, response) {
		debug(200, request.method, url, error);

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

	serveFile(url, path, request, response) {
		const config = this.config,
			type = mime(path),
			onError = (error) => error.code === 'EISDIR' ?
				url === config.url.path ?
					this.serveBadRequest(request, response) :
					this.serveForbidden(url, path, request, response) :
				this.serveError(error, request, response);

		response.setHeader('Server', this.version);
		response.setHeader('Content-Type', type);

		if (type === mime.html) {
			readFile(path)
				.then((content) => {
					response.end(
						this.patchHtml(content, request)
					);
				}, onError);
		} else {
			fs.createReadStream(path)
				.on('end', () => debug(200, request.method, url, 'from', path))
				.on('error', onError)
				.pipe(response);
		}
	}

	serveBadRequest(request, response) {
		debug(400, request.method, request.url);

		const url = this.config.url,
			host = request.headers.host || url.host;

		response.setHeader('Server', this.version);
		response.setHeader('Content-Type', mime.txt);
		response.writeHead('400');
		response.end(`400 Bad Request\n\nLoad ${url.protocol}//${host}${url.path}tasty.js on your page.`);
	}

	serveForbidden(url, path, request, response) {
		debug(403, request.method, url, 'as', path);

		response.setHeader('Server', this.version);
		response.setHeader('Content-Type', mime.txt);
		response.writeHead(403);
		response.end('403 Forbidden');
	}

	serveNotFound(url, path, request, response) {
		debug(404, request.method, url, 'as', path);

		response.setHeader('Server', this.version);
		response.setHeader('Content-Type', mime.txt);
		response.writeHead(404);
		response.end('404 Not Found');
	}

	serveError(error, request, response) {
		debug(500, request.method, error);

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
