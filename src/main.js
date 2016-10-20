'use strict';

// TODO exposable API?
export default tasty;

import io from 'socket.io-client';
import log from './log';
import tool from './tool';
import * as util from './util';

const include = util.include,
	reason = util.reason,
	thenable = util.thenable;

tasty.connect = connect;
tasty.delay = util.delay;
tasty.forEach = util.forEach;
tasty.hook = tool.hook;
tasty.isArray = util.isArray;
tasty.map = util.map;
tasty.session = util.session;
tasty.thenable = thenable;
tasty.tool = tool;

tasty.forEach(
	document.scripts || document.getElementsByTagName('script'),
	(script) => {
		if (script.src.indexOf('/tasty.js') !== -1) {
			const url = script.getAttribute('data-url') ||
				script.src.split('tasty.js')[0];
			url &&
				tasty({url: url}).connect();
		}
	}
);

function tasty(config) {
	config = typeof config === 'string' ?
		{url: config} :
		config || {};
	tasty.config = config;

	include.url = config.url;

	tasty.console = tool.console = log(
		config.hasOwnProperty('log') ?
			config.log === true ?
				window.console :
				config.log :
			window.console
	);

	return tasty;
}

function connect() {
	const url = tasty.config.url;
	tasty.session() ||
		tasty.console.log('tasty', 'server', url);

	const socket = io(url, {multiplex: false})
		.on('connect', () => connected(socket));
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
		tasty.console.debug('tasty', 'exec', include.url + key);

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
		// TODO get config from server.
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
