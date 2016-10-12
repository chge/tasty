'use strict';

module.exports = tasty;

const log = require('./log'),
	tool = require('./tool'),
	util = require('./util');

const include = util.include,
	reason = util.reason,
	thenable = util.thenable;

tasty.connect = connect;
tasty.forEach = util.forEach;
tasty.hook = tool.hook;
tasty.isArray = util.isArray;
tasty.map = util.map;
tasty.session = util.session;
tasty.thenable = thenable;
tasty.tool = tool;

tasty.forEach(document.scripts, (script) => {
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

	include.server = config.server;

	tasty.console = tool.console = log.init(
		config.hasOwnProperty('log') ?
			config.log === true ?
				window.console :
				config.log :
			window.console
	);

	return tasty;
}

function connect() {
	const server = tasty.config.server;
	tasty.session() ||
		tasty.console.log('tasty', 'server', server);

	// TODO bundle socket.io client to leave global scope clean.
	include('socket.io.js', () => {
		thenable(
			(resolve) => window.io ?
				resolve(window.io) :
				typeof define === 'function' && define.amd ?
					require(['socket.io'], resolve) :
					resolve(require('socket.io'))
		).then(
			(io) => {
				const socket = io(server, {multiplex: false})
					.on('connect', () => connected(socket));
			},
			(err) => {debugger;}
		);
	});
}

function connected(socket) {
	let reconnect = !!tasty.session();
	tasty.console.log('tasty', reconnect ? 'reconnected' : 'connected');

	socket.on('tool', (data, callback) => {
		const name = data[0],
			args = data.slice(1);

		const respond = (result) => {
			if (result instanceof Error) {
				tasty.console.error('tasty', result);
				result = [util.format(result)];
			} else {
				result = [null, result];
			}
			reconnect = false;

			callback(result);
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
		tasty.console.log('tasty', text);

		callback([]);
	});

	socket.on('exec', (key, callback) => {
		tasty.console.debug('tasty', 'exec', include.server + key);

		include(key, () => callback([]));
	});

	socket.on('coverage', (key, callback) => {
		key = key || '__coverage__';
		tasty.console.debug('tasty', 'coverage', key);

		callback([null, window[key]]);
		tasty.console.debug('tasty', 'coverage', key);
	});

	socket.on('end', (data, callback) => {
		tasty.console.info('tasty', 'end');
		tasty.session(null);
		callback([]);
		socket.close();
	});

	socket.emit('register', tasty.session(), (token) => {
		if (token) {
			tasty.session(token);
			tasty.console.debug('tasty', 'registered', token);
		} else {
			tasty.session(null);
			tasty.console.error('tasty', 'not registered');
			socket.close();
		}
	});
}
