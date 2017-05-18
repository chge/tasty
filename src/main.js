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
tasty.disconnect = disconnect;
tasty.dom = dom;
tasty.fail = fail;
tasty.find = dom.find;

/**
 * Client flaws.
 * @memberof tasty
 * @member {Object} flaws
 * @readonly
 * @prop {Boolean} doctype Client doesn't properly support DOM DocumentType. History-related tools won't work.
 * @prop {Boolean} font Client doesn't support Font Loading API. Font-related tools won't work.
 * @prop {Boolean} history Client doesn't fully support HTML5 History API. History-related tools won't work.
 * @prop {Boolean} navigation Client requires emulation of anchor navigation. Tasty will emulate navigation along with click.
 * @prop {Boolean} placeholder Client doesn't support placeholders. Search will skip input placeholders.
 * @prop {Boolean} pseudo Client can't search through pseudo-elements. Search will skip such elements, e.g. `:before` and `:after`.
 * @prop {Boolean} selector Client doesn't support Selectors API. Search with selectors won't work.
 * @prop {Boolean} shadow Client doesn't support Shadow DOM.
 * @prop {Boolean} validation Client doesn't support HTML5 Forms.
 * @prop {Boolean} websocket Client has unsupported WebSocket implementation. Tasty will use XHR polling, which is slower.
 */
tasty.flaws = tool.flaws = {
	doctype: !('doctype' in document) ||
		!document.doctype &&
			document.documentElement.previousSibling &&
				document.documentElement.previousSibling.nodeType === 8,
	font: !('fonts' in document),
	history: !('pushState' in history) ||
		// WORKAROUND: PhantomJS as of 2.1.1 incorrectly reports history length.
		navigator.userAgent.indexOf('PhantomJS') !== -1,
	navigation: !('click' in document.createElement('a')),
	placeholder: !('placeholder' in document.createElement('input')),
	pseudo: 'attachEvent' in window, // TODO better.
	selector: !('querySelector' in document),
	shadow: !('ShadowRoot' in window),
	validation: !('validity' in document.createElement('input')),
	websocket: !('WebSocket' in window) ||
		navigator.appVersion.indexOf('MSIE 10') !== -1 // TODO better.
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

dom.on(window, 'beforeunload', () => {
	disconnect();
});

dom.on(window, 'unload', () => {
	// NOTE this preserves session in case of app-initiated Storage.clear();
	tasty.id();

	disconnect();

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
 * @returns {Function} itself for chaining.
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
 * Connects to Tasty server configured in {@link #tasty|`tasty()`} call.
 * @memberof tasty
 * @see {@link #tasty|examples}
 */
function connect(_closed) {
	disconnect();

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

	connect.closed = _closed ?
		connect.closed + 1 :
		0;

	const socket = new eio(config.origin, {
		path: config.path || '/',
		query: query,
		transports: tasty.flaws.websocket ?
			['polling'] :
			// NOTE there could be some proxy or firewall configuration issues
			// which Engine.IO can't automatically handle and fallbak to polling.
			_closed ?
				['polling', 'websocket'] :
				['websocket']
	})
		.once('close', connect.closed < 5 ? connect : reason)
		.on('error', reason)
		.once('open', () => onOpen(socket, !!id))
}

/**
 * Disconnects from Tasty server.
 * @memberof tasty
 * @see {@link #tasty|examples}
 */
function disconnect() {
	const socket = tasty.socket;
	if (!socket) {
		return;
	}

	socket.removeListener('close', connect);
	socket.removeListener('error', reason);
	socket.close();

	delete tasty.socket;
}

/**
 * Fails current hook/tool.
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
	tasty.socket = socket;

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
				if (type === 'tool') {
					reconnect = false;
				}

				var callback;
				if (typeof result === 'function') {
					callback = result;
					result = [];
				} else if (result instanceof Error) {
					tasty.console.error('tasty', result);
					result = [0, util.format(result)];
				} else {
					result = [result];
				}
				socket.send(
					JSON.stringify([mid, 0, result]),
					callback
				);
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

			return () => {
				disconnect();
			};
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
