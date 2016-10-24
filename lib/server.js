'use strict';

module.exports = createServer;

const createHttp = require('http').createServer,
	createHttps = require('https').createServer,
	crypto = require('crypto'),
	EngineIO = require('engine.io'),
	glob = require('glob'),
	fs = require('fs'),
	parseUrl = require('url').parse,
	resolvePath = require('path').resolve;

const createCoverage = require('./coverage'),
	createRunner = require('./runner'),
	util = require('./util');

const delay = util.delay,
	mime = util.mime,
	parseJson = util.parseJson,
	random = util.random,
	readFile = util.readFile;

class Server {
	constructor(emitter, log, config) {
		this.clients = {
			id: 0
		};
		this.config = config;
		this.coverage = config.coverage ?
			createCoverage(config) :
			null;
		this.emitter = emitter;
		this.log = log;
		this.runners = {};
		this.scripts = {
			id: 0
		};
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
					this.server = createHttps({
						cert: cert,
						key: key,
						passphrase: passphrase
					});
				} else {
					this.server = createHttp();
				}
				this.server.listen(
					(config.url.port | 0) || 80,
					config.url.hostname === '0.0.0.0' ?
						null :
						config.url.hostname
				)
					.once('listening', () => {
						this.onListening();
						resolve(this);
					})
					.on('request', this.onRequest.bind(this))
					.on('upgrade', this.onUpgrade.bind(this))
					.on('error', (error) => {
						this.onError(error);
						reject(error);
					});

				const engine = new EngineIO.Server()
					.on('connection', this.onConnection.bind(this))
					.on('error', (error) => {
						this.log.error('server', error);
						reject(error);
					});
				engine.generateId = this.onHandshake.bind(this);
				this.engine = engine;
			});
		});
	}

	close() {
		return new Promise((resolve, reject) => {
			if (!this.server) {
				return reject(
					new Error('server is not listening')
				);
			}
			Object.keys(this.clients)
				.forEach((id) => {
					const client = this.clients[id];
					client && client.close &&
						client.close();
				});
			this.server.close(() => {
				this.log.log('server', 'stopped');
				resolve();
			});
		});
	}

	start(client) {
		const config = this.config,
			id = client.id,
			log = this.log.log;

		let runner = this.runners[id];
		if (!runner) {
			runner = this.initRunner(id);
		} else if (runner.ended) {
			this.deleteRunner(id);
			this.deleteScripts(id);

			return this.end(client);
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
						this.emitter.on(id + '.coverage', (data, callback) => {
							this.log.debug('client', id, 'coverage');

							this.coverage.collect(data)
								.catch(
									(error) => this.log.error('client', id, error)
								);
						});
					}

					this.emitter.emit('start', id, runner);

					// TODO exp runner API.
					runner.running = true;
					runner.run()
						.then(
							(result) => {
								log('client', runner.id, 'success');
							},
							(error) => {
								log('client', runner.id, 'failure', error && error.stack ? error.stack : error);

								runner.error = error;
							}
						)
						.then(() => {
							runner.ended = true;
							this.end(runner.id, config);
						});
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
			url = '/exec.' + id + '.' + sid + '.js',
			values = JSON.stringify(args);

		if (persistent) {
			scripts[id] = scripts[id] || [];
			scripts[id].push(url);
		}
		scripts[url] = `(${code}).apply(this,${values});`;

		return this.send(id, 'exec', url.slice(1))
			.then(() => {
				if (!persistent) {
					delete scripts[url];
				}
			});
	}

	end(id) {
		const config = this.config;

		// TODO timeout.
		return Promise.resolve()
			.then(() => {
				if (this.coverage && config.coverageReporter) {
					this.log.log('client', id, 'coverage', config.coverageReporter);

					return this.send(id, 'coverage')
						.then(
							(data) => this.coverage.collect(data)
						)
						.then(
							() => this.coverage.report()
						)
						.catch(
							(error) => this.log.error(error)
						);
				}
			})
			.then(
				() => Promise.race([
					this.send(id, 'end'),
					delay(2000)
				])
			)
			.then(
				() => null,
				(error) => error
			)
			.then((error) => {
				this.log.log('client', id, 'ended');

				this.emitter.removeAllListeners(id + '.coverage');
				this.emitter.removeAllListeners(id + '.reconnect');
				this.emitter.emit('end', id, this.runners[id].error || error);

				this.deleteClient(id);
			});
	}

	initRunner(id) {
		const config = this.config,
			log = this.log.log,
			warn = this.log.warn;

		log('client', id, 'runner', config.runner);
		config.slow &&
			log('client', id, 'slow', config.slow, 'ms');
		const files = util.glob(config.include, config.exclude);
		files.length ?
			log('test files', files) :
			warn('no test files found');

		const runner = createRunner(id, files, this, this.emitter, config);
		runner.id = id;
		runner.onTest = (name) => {
			this.emitter.emit('test', id, name);
			this.send(id, 'message', name);
		};
		runner.onPass = (name) => {
			this.emitter.emit('pass', id, name);
		};
		runner.onFail = (name, error) => {
			this.emitter.emit('fail', id, name, error);
		};
		this.runners[id] = runner;

		return runner;
	}

	deleteClient(id) {
		this.deleteRunner(id);
		this.deleteScripts(id);
		delete this.clients[id];
	}

	deleteRunner(id) {
		delete this.runners[id];
	}

	deleteScripts(id) {
		delete this.scripts[id];
	}

	onListening() {
		const config = this.config,
			log = this.log.log;

		log('server', config.url.href);
		config.static &&
			log('static', 'from', config.static);
		config.coverage &&
			log('static', 'coverage', config.coverage);

		this.emitter.emit('listening', config.url.href, config.static, config.coverage);
	}

	onRequest(request, response) {
		try {
			this.log.debug('static', request.method, request.headers.host || '(no host)', request.url);

			const config = this.config,
				url = request.url,
				path = parseUrl(url).pathname;
			if (path === config.url.path) {
				this.engine.handleRequest(request, response);
			} else if (path === config.url.path + 'tasty.js') {
				this.log.debug('server', 'script', url);
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
		this.engine.handleUpgrade(request, socket, head);
	}

	onHandshake(request) {
		// TODO validate id.
		let url = parseUrl(request.url, true),
			id = url.query.id,
			client = this.clients[id];
		if (id && client) {
			// NOTE this call is synchronous.
			client.close();

			return id;
		}

		const hash = crypto.createHash('sha1');
		hash.update(request.headers['user-agent']);
		hash.update(Date.now().toString());
		id = (
			++this.clients.id +
			hash.digest('hex')
		).substr(0, 5);

		return id;
	}

	onConnection(client) {
		const config = this.config,
			id = client.id,
			old = this.clients[id];

		this.clients[id] = client;
		client.mid = old ?
			old.mid :
			0;

		client.on('message', (raw) => this.onMessage(client, raw));

		this.start(client)
			.catch(
				(error) => this.onError(error)
			);
	}

	onMessage(client, raw) {
		const id = client.id,
			message = parseJson(raw);

		if (message instanceof Error) {
			this.log.warn('client', id, message);
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
		this.log.error('server', error);

		this.emitter.emit('error', error);
	}

	serveScript(url, response) {
		this.log.debug('server', 'script', url);

		// NOTE no considerable sources to instrument.
		response.setHeader('Content-Type', mime.js);
		response.end(
			this.scripts[url]
		);
	}

	serveStatic(request, response) {
		const config = this.config,
			url = request.url,
			path = resolvePath(config.static + url);

		// TODO configurable index?
		fs.access(path, fs.R_OK, (error) => {
			error ?
				this.serveNotFound(url, path, response) :
				config.coverage && mime(path) === mime.js ?
					this.serveInstrumented(url, path, response) :
					this.serveFile(url, path, response);
		});
	}

	serveInstrumented(url, path, response) {
		try {
			const config = this.config;
			readFile(path)
				.then(
					(content) => this.coverage.instrument(content.toString(), path)
				)
				.then(
					(instrumented) => {
						this.log.debug('static', 200, url, 'coverage', path);

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
		this.log.debug('static', 200, url, error);

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
		this.log.debug('static', 200, url, 'as', path);

		const config = this.config,
			type = mime(path);

		response.setHeader('Content-Type', type);
		if (type === mime.html && (config.coverage === 'istanbul' || config.coverage === 'nyc')) {
			// WORKAROUND: Istanbul and NYC use eval to get top-level scope.
			readFile(path)
				.then(
					(content) => response.end(
						content.toString()
							.replace('script-src ', "script-src 'unsafe-eval' ")
					)
					// TODO handle error.
				);
		} else {
			fs.createReadStream(path)
				.on(
					'error',
					(error) => error.code === 'EISDIR' ?
						this.serveForbidden(url, path, response) :
						this.serveError(error, response)
				)
				.pipe(response);
		}
	}

	serveBadRequest(url, response) {
		this.log.debug('static', 400, url);

		response.setHeader('Content-Type', mime.txt);
		response.writeHead('400');
		response.end(`400 Bad Request\n\nLoad ${this.config.url.href}tasty.js on your page.`);
	}

	serveForbidden(url, path, response) {
		this.log.debug('static', 403, url, 'as', path);

		response.setHeader('Content-Type', mime.txt);
		response.writeHead(403);
		response.end('403 Forbidden');
	}

	serveNotFound(url, path, response) {
		this.log.debug('static', 404, url, 'as', path);

		response.setHeader('Content-Type', mime.txt);
		response.writeHead(404);
		response.end('404 Not Found');
	}

	serveError(error, response) {
		this.log.debug('static', 500, error);

		if (!response.headersSent) {
			response.setHeader('Content-Type', mime.txt);
			response.writeHead(500);
		}
		response.end('500 Internal Server Error\n\n' + (error ? error.stack || error : error));
	}
}

function createServer(emitter, log, config) {
	return new Server(emitter, log, config);
}
