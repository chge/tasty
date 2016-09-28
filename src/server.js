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
			socket.emit('ready', generate(), (token) => {
				token = token | 0;

				// WORKAROUND: we use socket.io rooms to handle reconnects properly.

				let runner = runners[token];
				if (runner) {
					socket.join(token);
					emitter.emit('reconnect' + token);

					runner.finish &&
						finish(token, config);

					return;
				}

				runner = runners[token] = prepare(token, config);
				socket.join(token);

				log('client', token, 'ready');

				runner.run()
					.catch((error) => error)
					.then((error) => {
						log('client', token, error ? 'failure ' + error : 'success');

						runner.error = error;
						runner.finish = true;
						finish(token, config);
					});
			});
		});

	if (config.static) {
		log('static', url.format(config.static), 'from', config.static.root);

		statics = http.createServer((request, response) => {
			try {
				let path = config.static.root + request.url;
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
}

function close() {
	io.server.close();
	log('server', 'closed');

	statics.close();
	log('static', 'closed');
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

			config.exit === true &&
				process.exit(runners[token].error || error);
		});
}

function generate() {
	return generate.token = (generate.token | 0) + 1;
}
