'use strict';

// TODO exposable API?
export default tasty;

import eio from 'engine.io-client';

import log from './log';
import tool from './tool';
import * as dom from './dom';
import * as util from './util';

const include = util.include,
	parseJson = util.parseJson,
	reason = util.reason,
	thenable = util.thenable;

tasty.connect = connect;
tasty.delay = util.delay;
tasty.forEach = util.forEach;
tasty.hook = tool.hook;
tasty.isArray = util.isArray;
tasty.map = util.map;
tasty.id = util.session;
tasty.thenable = thenable;
tasty.tool = tool;

dom.on(window, 'unload', () => {
	// TODO configurable key.
	const key = '__coverage__';
	key in window &&
		sessionStorage.setItem(key, JSON.stringify(window[key]));
});

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
	const id = tasty.id(),
		url = tasty.config.url;
	id ||
		tasty.console.log('tasty', 'server', url);

	// TODO disable erroneous WebSocket implementations.
	const socket = new eio({
		path: '/',
		query: {
			id: id || undefined
		}
	}).on('open', () => onOpen(socket, !!id));
}

function onOpen(socket, reconnect) {
	tasty.id(socket.id);

	tasty.console.log('tasty', reconnect ? 'reconnected' : 'connected', tasty.id());

	socket.on('message', (raw) => {
		const message = parseJson(raw);
		if (message instanceof Error) {
			tasty.console.warn('tasty', message);
		} else {
			const mid = message[0],
				type = message[1],
				data = message[2];

			let promise = thenable(
				reconnect ?
					tool.hook(null, 'after.reconnect', null) :
					null
			)
			.then(
				() => onMessage(socket, type, data)
			)
			['catch'](
				(error) => error
			)
			.then((result) => {
				if (result instanceof Error) {
					tasty.console.error('tasty', result);
					result = [0, util.format(result)];
				} else {
					result = [result];
				}

				socket.send(JSON.stringify([mid, 0, result]));

				if (type === 'tool') {
					reconnect = false;
				}
			});
		}
	});

	// TODO configurable key.
	const key = '__coverage__',
		coverage = sessionStorage.getItem(key);
	coverage &&
		socket.send(
			JSON.stringify([0, 'coverage', JSON.parse(coverage)]),
			() => sessionStorage.removeItem(key)
		);
}

function onMessage(socket, type, data) {
	switch (type) {
		case 'coverage' :
			data = data || '__coverage__';
			tasty.console.debug('tasty', 'coverage', data);

			return thenable(window[data]);
		case 'end' :
			tasty.console.info('tasty', 'end');
			tasty.id(null);

			return thenable();
		case 'exec' :
			tasty.console.debug('tasty', 'exec', include.url + data);

			return include(data);
		case 'message' :
			tasty.console.log('tasty', data);

			return thenable();
		case 'tool' :
			const name = data[0],
				args = data.slice(1);

			return tool(name, args);
		default:
			return thenable(
				reason('unknown message', name)
			);
	}
}
