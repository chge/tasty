'use strict';

module.exports = tasty;

const log = require('./log'),
	tool = require('./tool'),
	util = require('./util');

const reason = util.reason,
	thenable = util.thenable;

tasty.connect = connect;
tasty.hook = tool.hook;
tasty.session = util.session;
tasty.thenable = thenable;
tasty.tool = tool;

[].forEach.call(document.scripts, (script) => {
	if (script.src.indexOf('/tasty.js') !== -1) {
		const server = script.getAttribute('data-server') ||
			script.src.split('tasty.js')[0];
		server &&
			tasty({server: server}).connect();
	}
});

function tasty(config) {
	config = typeof config === 'string' ?
		{server: config} :
		config || {};
	tasty.config = config;

	util.include.server = config.server;

	log.logger = config.hasOwnProperty('log') && config.log !== true ?
		config.log :
		console;

	return tasty;
}

function connect() {
	const server = tasty.config.server;
	tasty.session() ||
		log('server', server);

	util.include('socket.io.js', () => {
		// TODO bundle socket.io client to leave global scope clean.
		const io = window.io || require('socket.io-client');
		const socket = io(server, {multiplex: false})
			.on('connect', () => {connected(socket)});
	});
}

function connected(socket) {
	let reconnect = !!tasty.session();
	log(reconnect ? 'reconnected' : 'connected');

	tool.sync = sync.bind(socket);

	socket.on('tool', (data, callback) => {
		const name = data[0],
			args = data.slice(1);

		const respond = (result) => {
			if (result instanceof Error) {
				log.error(result);
				result = [util.format(result)];
			} else {
				result = [null, result];
			}
			reconnect = false;

			// WORKAROUND
			setTimeout(() => callback(result), 1);
		};

		thenable(
			reconnect ?
				tool.hook(null, 'after.reconnect', null) :
				null
		)
			.then(() => tool(name, args))
			.then(respond, respond);
	});

	socket.on('message', (text, callback) => {
		log(text);

		callback([]);
	});

	socket.on('exec', (key, callback) => {
		log.debug('exec', util.include.server + key);

		util.include(key, () => callback([]));
	});

	socket.on('coverage', (key, callback) => {
		key = key || '__coverage__';
		log.debug('coverage', key);

		callback([null, window[key]]);
		log.debug('coverage', key);
	});

	socket.on('finish', (data, callback) => {
		log.info('finish');
		tasty.session(null);
		callback([]);
		socket.close();
	});

	socket.emit('register', tasty.session(), (token) => {
		if (token) {
			tasty.session(token);
			log.debug('registered', token);
		} else {
			tasty.session(null);
			log.error('not registered');
			socket.close();
		}
	});
}

function sync(callback) {
	return thenable((resolve) => {
		resolve();
		this.emit('sync', tasty.session(), callback);
	});
}
