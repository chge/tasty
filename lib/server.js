'use strict';

module.exports = createServer;

const glob = require('glob'),
	fs = require('fs'),
	createHttp = require('http').createServer,
	createHttps = require('https').createServer,
	resolvePath = require('path').resolve,
	SocketIO = require('socket.io');

const createCoverage = require('./coverage'),
	createRunner = require('./runner'),
	util = require('./util');

const delay = util.delay,
	mime = util.mime,
	random = util.random;

class Server {
	constructor(emitter, log, config) {
		this.config = config;
		this.count = 0;
		this.coverage = config.coverage ?
			createCoverage(config) :
			null;
		this.emitter = emitter;
		this.log = log;
		this.runner = {};
		this.script = {
			id: 0
		};
	}

	listen() {
		return new Promise((resolve, reject) => {
			const config = this.config;

			Promise.all([
				config.cert ?
					this.readFile(config.cert) :
					null,
				config.key ?
					this.readFile(config.key) :
					null
			])
				.then(
					(credentials) => {
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
							.on('error', (error) => {
								this.onError(error);
								reject(error);
							});

						this.io = SocketIO(this.server)
							.path(config.url.path || '/')
							.on('connection', this.onConnection.bind(this))
							.on('error', (error) => {
								this.log.error('server', error);
								reject(error);
							});
					}
				);
		});
	}

	close() {
		return new Promise((resolve, reject) => {
			if (!this.server) {
				return reject(
					new Error('server is not listening')
				);
			}
			Object.keys(this.io.sockets).forEach(
				(id) => this.io.sockets[id].disconnect()
			);
			this.server.close(() => {
				this.log.log('server', 'stopped');
				resolve();
			});
		});
	}

	register(token, socket) {
		this.count = this.count | 0;
		const config = this.config,
			log = this.log.log,
			warn = this.log.warn;

		let runner = this.runner[token];
		if (token && token.length === 4 && runner) {
			socket.join(token);

			if (runner.end) {
				this.end(token, config);
			} else {
				// TODO chain?
				const urls = this.script[token];
				Promise.all(
					urls ?
						urls.map(
							(url) => this.send(token, 'exec', url.slice(1))
						) :
						[]
				)
					.then(
						() => this.emitter.emit('reconnect.' + token)
					);
			}

			return null;
		}
		token = this.newToken();

		socket.join(token);

		log('client', token, 'runner', config.runner);
		config.slow &&
			log('client', token, 'slow', config.slow, 'ms');
		const files = util.glob(config.include, config.exclude);
		files.length ?
			log('test files', files) :
			warn('no test files found');

		runner = this.runner[token] = createRunner(token, files, this, this.emitter, config);
		runner.token = token;
		runner.onTest = (name) => {
			this.emitter.emit('test', token, name);
			this.send(token, 'message', name);
		};
		runner.onPass = (name) => {
			this.emitter.emit('pass', token, name);
		};
		runner.onFail = (name, error) => {
			this.emitter.emit('fail', token, name, error);
		};

		return runner;
	}

	send(token, name, data) {
		// WORKAROUND: we use socket.io rooms to handle reconnects properly.
		return new Promise((resolve, reject) => {
			this.io.in(token).clients((error, ids) => {
				ids.forEach((id) => {
					this.emitter.once('reconnect.' + token, resolve);

					this.io.connected[id].emit(name, data, (response) => {
						this.emitter.removeListener('reconnect.' + token, resolve);

						let error = response[0],
							result = response[1];
						error ?
							reject(
								Object.assign(new Error(), error)
							) :
							resolve(result);
					});
				});
			});
		});
	}

	exec(token, code, args, persistent) {
		let id = ++this.script.id,
			url = '/exec.' + token + '.' + id + '.js',
			values = JSON.stringify(args);

		if (persistent) {
			this.script[token] = this.script[token] || [];
			this.script[token].push(url);
		}
		this.script[url] = `(${code}).apply(this,${values});`;
		return this.send(token, 'exec', url.slice(1))
			.then(() => {
				if (!persistent) {
					delete this.script[url];
				}
			});
	}

	end(token) {
		const config = this.config;

		// TODO timeout.
		return Promise.resolve()
			.then(() => {
				if (this.coverage && config.format) {
					this.log.log('client', token, 'coverage', config.format);

					return this.send(token, 'coverage')
						.then(
							(data) => this.coverage.report(data)
						)
						.catch(
							(error) => this.log.error(error)
						);
				}
			})
			.then(
				() => Promise.race([
					this.send(token, 'end'),
					delay(2000)
				])
			)
			.then(
				() => null,
				(error) => error
			)
			.then((error) => {
				this.log.log('client', token, 'ended');

				this.emitter.removeAllListeners('reconnect.' + token);
				this.emitter.emit('end', token, this.runner[token].error || error);

				delete this.runner[token];
				delete this.script[token];
			});
	}

	newToken() {
		// TODO better.
		return [
			(++this.count).toString(16),
			random(0, 15).toString(16),
			random(0, 15).toString(16),
			random(0, 15).toString(16)
		].join('').substr(0, 4);
	}

	deleteScripts(token) {
		delete this.script[token];
	}

	readFile(path) {
		return new Promise(
			(resolve, reject) => fs.readFile(
				path,
				(error, content) => error ?
					reject(error) :
					resolve(content)
			)
		);
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

	onConnection(socket) {
		const config = this.config,
			log = this.log.log;

		// WORKAROUND: we use socket.io rooms to handle reconnects properly.
		socket.on('register', (token, callback) => {
			let runner = this.register(token, socket, config);
			runner ?
				callback(runner.token) :
				callback(token);

			if (runner && config.autorun) {
				this.emitter.emit('start', token);

				runner.run()
					.then(
						(result) => {
							log('client', runner.token, 'success');
						},
						(error) => {
							log('client', runner.token, 'failure', error && error.stack ? error.stack : error);

							runner.error = error;
						}
					)
					.then(() => {
						runner.end = true;
						this.end(runner.token, config);
					});
			}
		});
	}

	onRequest(request, response) {
		try {
			const config = this.config,
				url = request.url;
			if (url === config.url.path + 'tasty.js') {
				this.log.debug('server', 'script', url);
				this.serveFile(url, __dirname + '/../dist/tasty.js', response);
			} else if (this.script[url]) {
				this.serveScript(url, response);
			} else if (url === '/' || url === config.url.path) {
				this.serveBadRequest(url, response);
			} else if (config.static) {
				this.serveStatic(request, response);
			} else {
				this.serveNotFound(url, null, response);
			}
		} catch (thrown) {
			this.serveError(thrown, response);
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
			this.script[url]
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
			this.readFile(path)
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
	error.name = ${JSON.stringify(request.url)};
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
			this.readFile(path)
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

		response.setHeader('Content-Type', mime.txt);
		response.writeHead(500);
		response.end('500 Internal Server Error\n\n' + (error ? error.stack || error : error));
	}
}

function createServer(emitter, log, config) {
	return new Server(emitter, log, config);
}
