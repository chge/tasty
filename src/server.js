'use strict';

module.exports = {
	close: close,
	emit: emit,
	listen: listen
};

const Emitter = require('events'),
	fs = require('fs'),
	http = require('http'),
	https = require('https'),
	socketio = require('socket.io'),
	url = require('url');

const log = require('./log'),
	prepare = require('./runner').prepare,
	tool = require('./tool');

let io,
	statics;

let emitter = new Emitter(),
	runners = {};

function listen(config) {
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

			// WORKAROUND for forked runners.
			socket.on('bridge', (args, callback) => {
				emit(...args, true).then(callback);
			});
		});

	if (config.static) {
		log('static', url.format(config.static), 'from', config.static.root);

		statics = http.createServer((request, response) => {
			try {
				let path = config.static.root + request.url;
				if (fs.existsSync(path)) {
					// TODO MIME.
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
}

function close() {
	io.server.close();
	log('server', 'closed');

	statics.close();
	log('static', 'closed');
}

function register(token, socket, config) {
	token = token | 0;
	register.token = register.token | 0;
	let runner;

	if (token) {
		runner = runners[token]
		if (runner) {
			socket.join(token);

			runner.finish ?
				finish(token, config) :
				emitter.emit('reconnect' + token);

			return null;
		}
	}
	token = ++register.token;

	socket.join(token);

	runner = runners[token] = prepare(token, config);
	runner.token = token;

	return runner;
}

function emit(token, name, data, reconnect) {
	// WORKAROUND: we use socket.io rooms to handle reconnects properly.
	return new Promise((resolve, reject) => {
		io.in(token).clients(function (error, ids) {
			ids.forEach((id) => {
				io.connected[id].emit(name, data, (response) => {
					let result = response[0],
						error = response[1];
					if (error) {
						error = Object.assign(new Error(), error);
						reconnect ?
							emitter.once('reconnect' + token, () => reject(error)) :
							reject(error);
					} else {
						reconnect ?
							emitter.once('reconnect' + token, () => resolve(result)) :
							resolve(result);
					}
				})
			});
		});
	});
}

function finish(token, config) {
	emit(token, 'finish', null)
		.then(() => null, (error) => error)
		.then((error) => {
			log('client', token, 'finished');

			config.exit &&
				process.exit(
					runners[token] && runners[token].error || error
				);
		});
}
