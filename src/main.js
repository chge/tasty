'use strict';

export default Tasty;

import Flaws from './flaws';
import Hooks from './hooks';
import Logger from './logger';
import Tools from './tools';

import * as dom from './dom';
import * as utils from './utils';

const COVERAGE = '__coverage__';

const reason = utils.reason,
	thenable = utils.thenable;

/**
 * Tasty client.
 * @example <!-- HTML (auto-connect) -->
<script src="//localhost:8765/tasty.js"></script>
 * @example <!-- HTML (auto-connect) -->
<script src="//localhost:8765/tasty.js" data-url="localhost:5678"></script>
 * @example <!-- HTML (manual mode) -->
<script src="//localhost:8765/tasty.js" data-manual></script>
<script>
	new Tasty('localhost:5678').connect();
</script>
 * @example // ES2015
import Tasty from 'tasty';
new Tasty('localhost:8765').connect();
 * @example // AMD
define(['tasty'], (Tasty) => {
	new Tasty('localhost:8765').connect();
});
 * @example // CommonJS
const Tasty = require('tasty');
new Tasty('localhost:8765').connect();
 */
class Tasty {
	/**
	 * Tasty instance is available inside {@link /tasty/?api=test#exec|exec} calls as `this`.
	 * @param {Object|string} [config] Tasty client config (or server URL).
	 * @param {Logger} [config.logger] {@link #Logger|Logger} instance.
	 * @param {string} [config.url] Tasty server URL.
	 */
	constructor(config) {
		config = config ?
			typeof config === 'string' ?
				{url: config} :
				config :
			{};

		// WORKAROUND: built-in URL parser.
		let link = document.createElement('a');
		link.href = config.url || '';
		config.coverage = config.coverage || COVERAGE;
		config.path = link.pathname,
		config.origin = link.origin ||
			link.protocol + '//' + link.host;
		config.url = link.href;
		link = null;

		// NOTE don't use bind();
		dom.on(window, 'beforeunload', () => this.onBeforeUnload());
		dom.on(window, 'unload', () => this.onUnload());

		this.ack = {};
		this.config = config;
		this.dom = dom;
		this.flaws = new Flaws();
		this.hooks = new Hooks(this);
		this.logger = config.logger || new Logger();
		this.tools = new Tools(this);
		this.utils = utils;

		this.Promise = utils.Promise;

		this.onOpenBound = (event) => this.onOpen(event);
		this.onCloseBound = () => this.onClose();
		this.onMessageBound = (event) => this.onMessage(event.data);
	}

	/**
	 * Connects to Tasty server.
	 */
	connect() {
		this.disconnect();

		const config = this.config,
			id = config.id || this.id(),
			logger = this.logger;
		id ?
			logger.debug('server', config.url) :
			logger.info('server', config.url);

		const flaws = Flaws.format(this.flaws),
			query = (id ? 'id=' + id + '&' : '') +
				(flaws ? 'flaws=' + flaws : '');
		flaws && !id &&
				logger.warn('client', 'flaws', flaws);

		const WebSocket = config.WebSocket || window.WebSocket || window.MozWebSocket,
			socket = new WebSocket(
				'ws' + config.origin.substr(4) +
					config.path + (query ? '?' + query : '')
			);
		socket.addEventListener('open', this.onOpenBound);
		socket.addEventListener('close', this.onCloseBound);
		socket.addEventListener('message', this.onMessageBound);
		socket.addEventListener('error', reason);

		this.socket = socket;

		return this;
	}

	/**
	 * Disconnects from Tasty server.
	 */
	disconnect() {
		const socket = this.socket;
		if (socket) {
			socket.removeEventListener('open', this.onOpenBound);
			socket.removeEventListener('close', this.onCloseBound);
			socket.removeEventListener('message', this.onMessageBound);
			socket.removeEventListener('error', reason);
			socket.close();
		}
		delete this.socket;

		return this;
	}

	/**
	 * Returns client ID.
	 * @function Tasty#id
	 * @return {string|null} Current ID.
	 */
	/**
	 * (Re)sets client ID.
	 * @param {string} id
	 * @return {string|null} Previous ID.
	 */
	id(next) {
		// TODO store ID in a cookie?
		const key = this.config.session,
			prev = this._id ||
				window.sessionStorage &&
					window.sessionStorage.getItem(key);
		next = arguments.length ? next : prev;

		this._id = next;
		next ?
			window.sessionStorage &&
				window.sessionStorage.setItem(key, next) :
			window.sessionStorage &&
				window.sessionStorage.removeItem(key);

		return prev;
	}

	onOpen() {
		this.closed = 0;

		if (window.sessionStorage) {
			const key = this.config.coverage,
				coverage = window.sessionStorage.getItem(key);
			if (coverage) {
				this.socket.send(
					JSON.stringify([0, 'coverage', JSON.parse(coverage)])
				);
				window.sessionStorage.removeItem(key)
			}
		}
	}

	onClose() {
		this.closed = (this.closed | 0) + 1;

		this.closed < 5 ?
			this.connect() :
			this.logger.error('connect retry limit', 5, 'reached');
	}

	onMessage(raw) {
		const message = utils.parseJson(raw),
			logger = this.logger;
		if (message instanceof Error) {
			logger.warn(message);

			return;
		}
		const hooks = this.hooks,
			mid = message[0],
			type = message[1],
			data = message[2];

		hooks.update &&
			hooks.update();

		hooks.run(undefined, 'before.' + type)
			.then(() => {
				switch (type) {
					case 'ack':
						return this.onAck(mid);
					case 'connect':
						return this.onConnect(data);
					case 'coverage':
						return this.onCoverage(data);
					case 'end':
						return this.onEnd();
					case 'exec':
						return this.onExec(data);
					case 'log':
						return this.onLog(data);
					case 'noop':
						return this.onNoop();
					case 'tool':
						return this.onTool(data);
					default:
						return this.onUnknown(name, data);
				}
			})
			.then(
				(result) => hooks.run(result, 'after.' + type)
			)['catch'](
				(error) => error
			).then((result) => {
				if (typeof result === 'function') {
					this.ack[mid] = result;
					this.socket.send(
						JSON.stringify([mid, 'ack', []])
					);
				} else {
					if (result instanceof Error) {
						logger.error(result);
						result = [0, utils.format(result)];
					} else {
						result = [result];
					}
					this.socket.send(
						JSON.stringify([mid, 0, result])
					);
				}
			});
	}

	onAck(mid) {
		const callback = this.ack[mid];
		if (callback) {
			delete this.ack[mid];

			return callback();
		} else {
			this.logger.warn('no ack', mid);
		}
	}

	onConnect(id) {
		const prev = this.id(id);
		this.logger.log(prev ? 'reconnected' : 'connected', id);
	}

	onCoverage(name) {
		name = name || COVERAGE;
		this.logger.log('coverage', name);

		return window[name];
	}

	onEnd() {
		this.logger.info('end');
		this.id(null);

		return () => {
			this.disconnect();
		};
	}

	onExec(path) {
		const url = this.config.origin + path;
		this.logger.log('exec', url);

		window[path] = this;

		return utils.include(url).then(
			() => {
				const result = window[path];
				delete window[path];

				// NOTE prevent callback to be used as Promise executor.
				return typeof result === 'function' ?
					result :
					thenable(result);
			},
			(error) => {
				delete window[path];

				throw error;
			}
		);
	}

	onLog(text) {
		this.logger.info(text);
	}

	onNoop() {}

	onTool(data) {
		const name = data[0],
			args = data.slice(1);

		return this.tools.use(name, args);
	}

	onUnknown(name) {
		return thenable(
			reason('unknown message', name)
		);
	}

	onBeforeUnload() {
		this.disconnect();
	}

	onUnload() {
		// NOTE preserve ID in case of app-initiated Storage.clear();
		this.id();

		this.disconnect();

		const key = this.config.coverage;
		key in window &&
			window.sessionStorage &&
				window.sessionStorage.setItem(key, JSON.stringify(window[key]));
	}
}

/**
 */
Tasty.COVERAGE = COVERAGE;

/**
 * Reference to {@link #Hooks|Hooks} class.
 */
Tasty.Hooks = Hooks;

/**
 * Reference to {@link #Tasty|Tasty} class.
 */
Tasty.Tasty = Tasty;

/**
 * Reference to {@link #Tools|Tools} class.
 */
Tasty.Tools = Tools;

// NOTE autoconnect.
utils.forEach(
	document.scripts ||
		document.getElementsByTagName('script'),
	(script) => {
		if (script.src.indexOf('/tasty.js') !== -1 || script.src.indexOf('/tasty.min.js') !== -1) {
			const manual = script.hasAttribute('data-manual') || script.src.indexOf('manual') !== -1,
				url = script.getAttribute('data-url') || script.src.replace('tasty.js', '').replace('tasty.min.js', '');
			if (url && !manual) {
				new Tasty(url).connect();
			}
		}
	}
);
