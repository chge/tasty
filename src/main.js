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
tasty.dom = dom;
tasty.fail = fail;
tasty.find = dom.find;
/**
 * Client flaws.
 * @memberof tasty
 * @member {Object} flaws
 * @readonly
 * @prop {Boolean} navigation Client requires emulation of anchor navigation.
 * @prop {Boolean} placeholder Client doesn't support placeholders.
 * @prop {Boolean} pseudo Client can't search through pseudo-elements.
 * @prop {Boolean} selector Client doesn't support Selectors API.
 * @prop {Boolean} websocket Client has unsupported WebSocket implementation.
 */
tasty.flaws = tool.flaws = {
	navigation: !('click' in document.createElement('a')),
	placeholder: !('placeholder' in document.createElement('input')),
	pseudo: !!window.attachEvent, // TODO better.
	selector: !document.querySelector,
	websocket: navigator.appVersion.indexOf('MSIE 10') !== -1 // TODO better.
};
tasty.forEach = util.forEach;
tasty.format = util.format;
tasty.hook = tool.hook;
tasty.id = util.session;
tasty.isArray = util.isArray;
tasty.map = util.map;
tasty.parseJson = parseJson;
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
				tasty(url).connect();
		}
	}
);

/**
 * Client-side API available in browser environment.
 * @function tasty
 * @param {Config|String} [config] Tasty client config (or server URL).
 * @param {Boolean|Object} [config.log=true] Console logging.
 * @param {String} [config.url] Tasty server URL.
 * @return {Function} itself for chaining.
 * @example <!-- HTML (auto-connect) -->
<script src="//localhost:8765/tasty.js"></script>
 * @example // ES2015
import tasty from 'tasty';
tasty('//localhost:8765/').connect();
 * @example // AMD
define(['tasty'], (tasty) => {
	tasty('//localhost:8765/').connect();
});
 * @example // CommonJS
require('tasty')('//localhost:8765/').connect();
 */
function tasty(config) {
	config = config ?
		typeof config === 'string' ?
			{url: config} :
			config :
		{};

	// WORKAROUND: built-in URL parser.
	let link = document.createElement('a');
	link.href = config.url || '';
	config.path = link.pathname,
	config.origin = link.origin ||
		link.protocol + '//' + link.host;
	config.url = link.href;
	link = null;

	tasty.config = config;

	include.url = config.url;

	reason.console = tasty.console = tool.console = log(
		config.hasOwnProperty('log') ?
			config.log === true ?
				window.console :
				config.log :
			window.console
	);

	return tasty;
}

/**
 * Connect to Tasty server configured in {@link #tasty|`tasty()`} call.
 * @memberof tasty
 * @see {@link Client|examples}
 */
function connect() {
	const config = tasty.config,
		id = config.id || tasty.id();
	id ?
		tasty.console.debug('tasty', 'server', config.url) :
		tasty.console.info('tasty', 'server', config.url);

	const flaws = util.flaws(tasty.flaws),
		query = {};
	if (id) {
		query.id = id;
	}
	if (flaws) {
		id ||
			tasty.console.warn('tasty', 'client', 'flaws', flaws);
		query.flaws = flaws;
	}

	const socket = new eio(config.origin, {
		path: config.path || '/',
		query: query,
		transports: window.WebSocket && !tasty.flaws.websocket ?
			['websocket'] :
			['polling']
	})
		.once('close', connect)
		.on('error', reason)
		.once('open', () => onOpen(socket, !!id))
}

/**
 * Fail current hook/tool.
 * @memberof tasty
 * @method fail
 * @param {...*} args Values to log.
 * @throws {Error}
 */
function fail(...args) {
	throw reason(...args);
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

			thenable(
				reconnect ?
					tool.hook(null, 'after.reconnect', null) :
					null
			)
			.then(
				() => onMessage(socket, type, data)
			)['catch'](
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
		case 'coverage':
			data = data || '__coverage__';
			tasty.console.log('tasty', 'coverage', data);

			return thenable(window[data]);
		case 'end':
			tasty.console.info('tasty', 'end');
			tasty.id(null);
			socket.removeListener('close', connect);
			socket.removeListener('error', reason);
			socket.close();

			return thenable();
		case 'exec':
			tasty.console.log('tasty', 'exec', include.url + data);

			return include(data);
		case 'message':
			tasty.console.info('tasty', data);

			return thenable();
		case 'tool': {
			const name = data[0],
				args = data.slice(1);

			return tool(name, args);
		}
		default:
			return thenable(
				reason('unknown message', name)
			);
	}
}
