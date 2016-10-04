'use strict';

module.exports = {
	close: close,
	exec: exec,
	listen: listen,
	send: send
};

const Emitter = require('events'),
	fs = require('fs'),
	http = require('http'),
	https = require('https'),
	socketio = require('socket.io'),
	url = require('url');

const coverage = require('./coverage'),
	log = require('./log'),
	prepare = require('./runner').prepare,
	tool = require('./tool'),
	util = require('./util');

const mime = util.mime,
	random = util.random;

let io,
	statics;

let emitter = new Emitter(),
	runners = {};

function listen(config) {
	let server = http.createServer((request, response) => {
		switch (request.url) {
			case '/':
			case config.server.path:
				response.setHeader('Content-Type', mime('txt'));
				response.writeHead('400');
				response.end(`400 Bad Request\nLoad ${url.format(config.server)}tasty.js on your page.`);
				break;
			case config.server.path + 'tasty.js':
				response.setHeader('Content-Type', mime('js'));
				response.end(
					fs.readFileSync(__dirname + '/../../dist/tasty.js')
				);
				break;
			case config.server.path + 'socket.io.js':
				response.setHeader('Content-Type', mime('js'));
				response.end(
					fs.readFileSync(__dirname + '/../../node_modules/socket.io-client/socket.io.js')
				);
				break;
			default:
				if (exec.code[request.url]) {
					response.setHeader('Content-Type', mime('js'));
					response.end(
						exec.code[request.url]
					);
				} else {
					response.setHeader('Content-Type', mime('txt'));
					response.writeHead('404');
					response.end('404 Not Found');
				}
		}
	})
		.listen(
			config.server.port | 0,
			config.server.hostname === '0.0.0.0' ?
				null :
				config.server.hostname
		);

	log('server', url.format(config.server));

	io = socketio(server).path(config.server.path)
		.on('connection', (socket) => {
			// WORKAROUND: client performs sync before reconnect to get ack on ack.
			socket.on('sync', (data, callback) => callback());

			// WORKAROUND: we use socket.io rooms to handle reconnects properly.
			socket.on('register', (token, callback) => {
				let runner = register(token, socket, config);
				runner ?
					callback(runner.token) :
					callback(token);

				runner && config.autorun &&
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
							runner.finish = true;
							finish(runner.token, config);
						});
			});
		});

	if (config.static) {
		log('static', url.format(config.static), 'from', config.static.root);
		config.coverage &&
			log('static', 'coverage', config.coverage.instrumenter);

		statics = http.createServer((request, response) => {
			try {
				// TODO configurable index.
				const path = config.static.root +
					(request.url === '/' ? '/index.html' : request.url);

				if (fs.existsSync(path)) {
					const type = mime(path);
					let content = fs.readFileSync(path);

					if (config.coverage) {
						if (type === mime.js) {
							try {
								content = coverage.instrument(content.toString(), request.url, config);
							} catch (thrown) {
								content = `
(function() {
	var error = new Error(${JSON.stringify(thrown.message)});
	error.name = ${JSON.stringify(request.url)};
	throw error;
/*
${thrown.stack}
*/
})();
`;
							}
						} else if (type === mime.html) {
							// WORKAROUND: Istanbul uses eval to get top-level scope.
							content = config.coverage.instrumenter === 'istanbul' ?
								content.toString().replace('script-src ', "script-src 'unsafe-eval' ") :
								content;
						}
					}

					response.setHeader('Content-Type', type);
					response.end(content);
				} else {
					response.setHeader('Content-Type', mime('txt'));
					response.writeHead(404);
					response.end('404 Not Found');
				}
			} catch (thrown) {
				response.setHeader('Content-Type', mime('txt'));
				if (thrown.code === 'EISDIR') {
					response.writeHead(403);
					response.end('403 Forbidden');
				} else {
					response.writeHead(500);
					response.end('500 Internal Server Error\n\n' + (thrown.stack || thrown));
				}
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
}

function close() {
	io.server.close();
	log('server', 'closed');

	statics.close();
	log('static', 'closed');
}

function register(token, socket, config) {
	register.count = register.count | 0;
	let runner;

	if (token && token.length === 4 && (runner = runners[token])) {
		socket.join(token);

		if (runner.finish) {
			finish(token, config);
		} else {
			// TODO chain?
			const keys = exec.persistent ?
				exec.persistent[token] :
				null;
			Promise.all(
				keys ?
					Object.keys(keys).map(
						(key) => send(token, 'exec', key.slice(1), keys[key])
					) :
					[]
			)
				.then(
					() => emitter.emit('reconnect.' + token)
				);
		}

		return null;
	}
	// TODO better.
	token = ('' + (++register.count) + random(0, 9) + random(0, 9) + random(0, 9)).substr(0, 4);

	socket.join(token);

	runner = runners[token] = prepare(token, config);
	runner.token = token;

	return runner;
}

function send(token, name, data, reconnect) {
	// WORKAROUND: we use socket.io rooms to handle reconnects properly.
	return new Promise((resolve, reject) => {
		io.in(token).clients(function (error, ids) {
			ids.forEach((id) => {
				io.connected[id].emit(name, data, (response) => {
					let error = response[0],
						result = response[1];
					if (error) {
						error = Object.assign(new Error(), error);
						reconnect ?
							emitter.once('reconnect.' + token, () => reject(error)) :
							reject(error);
					} else {
						reconnect ?
							emitter.once('reconnect.' + token, () => resolve(result)) :
							resolve(result);
					}
				})
			});
		});
	});
}

function exec(token, code, args, reconnect, persistent) {
	let id = ++exec.id,
		key = '/exec.' + token + '.' + id + '.js',
		values = JSON.stringify(args);

	exec.code[key] = `(${code}).apply(this,${values});`;
	if (persistent) {
		exec.persistent = exec.persistent || {};
		exec.persistent[token] = exec.persistent[token] || {};
		exec.persistent[token][key] = !!reconnect;
	}

	return send(token, 'exec', key.slice(1), reconnect)
		.then(() => {
			if (!persistent) {
				delete exec[key];
			}
		});
}
exec.id = 0;
exec.code = {};
exec.persistent = {};

function finish(token, config) {
	// TODO timeout.
	return Promise.resolve()
		.then(() => {
			if (config.coverage) {
				log('client', token, 'coverage', config.coverage.instrumenter);

				return send(token, 'coverage')
					.then(
						(data) => coverage.report(data, config)
					)
					.catch(
						(error) => log(error)
					);
			}
		})
		.then(
			() => send(token, 'finish')
		)
		.then(
			() => null,
			(error) => error
		)
		.then((error) => {
			log('client', token, 'finished');

			if (exec.persistent) {
				delete exec.persistent[token];
			}

			// TODO via API.
			if (config.exit) {
				const code = (runners[token] && runners[token].error || error) | 0;

				log('exit', code);

				process.exit(code);
			}
		});
}
