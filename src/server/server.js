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

		statics = http.createServer((request, response) => {
			try {
				const path = config.static.root + request.url;
				if (fs.existsSync(path)) {
					response.setHeader('Content-Type', mime(path));
					response.end(
						fs.readFileSync(path)
					);
				} else {
					response.setHeader('Content-Type', mime('txt'));
					response.writeHead(404);
					response.end('404 Not Found');
				}
			} catch (thrown) {
				response.setHeader('Content-Type', mime('txt'));
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
	register.count = register.count | 0;
	let runner;

	if (token && token.length === 4 && (runner = runners[token])) {
		if (config.mode === 'single') {
			// TODO stop runner.
			delete runners[token];
		} else {
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
	return send(token, 'finish', null)
		.then(() => null, (error) => error)
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

function mime(path) {
	const TYPE = {
		css: 'text/css',
		htm: 'text/html',
		html: 'text/html',
		js: 'application/javascript',
		txt: 'text/plain'
	};

	let ext = path.split('.');
	ext = ext[ext.length - 1];

	return TYPE[ext] ||
		'application/octet-stream';
}

function random(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}
