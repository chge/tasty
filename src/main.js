'use strict';

export default Tasty;

import eio from 'engine.io-client';

import Flaws from './flaws';
import Hooks from './hooks';
import Logger from './logger';
import Tools from './tools';

import * as dom from './dom';
import * as utils from './utils';

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
		config.coverage = config.coverage || '__coverage__';
		config.path = link.pathname,
		config.origin = link.origin ||
			link.protocol + '//' + link.host;
		config.url = link.href;
		link = null;

		// NOTE don't use bind();
		dom.on(window, 'beforeunload', () => this.onBeforeUnload());
		dom.on(window, 'unload', () => this.onUnload());

		this.config = config;
		this.dom = dom;
		this.flaws = new Flaws();
		this.hooks = new Hooks(this);
		this.logger = config.logger || new Logger();
		this.tools = new Tools(this);
		this.utils = utils;

		this.Promise = utils.Promise;

		// WORKAROUND for EIO EventEmitter.
		// NOTE don't use bind();
		this.onClosedBound = () => this.onClosed();
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
			query = {};
		if (id) {
			query.id = id;
		}
		if (flaws) {
			id ||
				logger.warn('client', 'flaws', flaws);
			query.flaws = flaws;
		}

		const socket = new eio(config.origin, {
			path: config.path || '/',
			query: query,
			transports: this.flaws.websocket ?
				['polling'] :
				// NOTE there could be some proxy or firewall configuration issues
				// which Engine.IO can't automatically handle and fallbak to polling.
				this.closed ?
					['polling', 'websocket'] :
					['websocket']
		}).once(
			'close',
			this.onClosedBound
		).once(
			'open',
			() => this.onOpen(socket)
		).on(
			'error',
			reason
		);

		return this;
	}

	/**
	 * Disconnects from Tasty server.
	 */
	disconnect() {
		const socket = this.socket;
		if (socket) {
			socket.removeListener('close', this.onClosedBound);
			socket.removeListener('error', reason);
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

	onOpen(socket) {
		this.reconnected = !!this.id(socket.id);
		this.socket = socket;

		this.logger.log(this.reconnected ? 'reconnected' : 'connected', this.id());

		socket.on('message', (raw) => this.onMessage(raw));

		const key = this.config.coverage,
			coverage = window.sessionStorage &&
				window.sessionStorage.getItem(key);
		coverage &&
			socket.send(
				JSON.stringify([0, 'coverage', JSON.parse(coverage)]),
				() => window.sessionStorage &&
					window.sessionStorage.removeItem(key)
			);
	}

	onClosed() {
		this.closed = (this.closed | 0) + 1;

		this.closed < 5 &&
			this.connect();
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

		thenable(
			this.reconnected ?
				hooks.run(undefined, 'after.reconnect') :
				null
		).then(
			() => hooks.run(undefined, 'before.' + type)
				.then(() => {
					switch (type) {
						case 'coverage':
							return this.onCoverage(data);
						case 'noop':
							return this.onNoop();
						case 'end':
							return this.onEnd();
						case 'exec':
							return this.onExec(data);
						case 'log':
							return this.onLog(data);
						case 'tool':
							return this.onTool(data);
						default:
							return this.onUnknown(name, data);
					}
				})
				.then(
					(result) => hooks.run(result, 'after.' + type)
				)
		)['catch'](
			(error) => error
		).then((result) => {
			// WORKAROUND
			if (type === 'noop') {
				this.reconnected = false;
			}

			var callback;
			if (typeof result === 'function') {
				callback = result;
				result = [];
			} else if (result instanceof Error) {
				logger.error(result);
				result = [0, utils.format(result)];
			} else {
				result = [result];
			}
			this.socket.send(
				JSON.stringify([mid, 0, result]),
				callback
			);
		});
	}

	onCoverage(name) {
		name = name || '__coverage__';
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
		if (script.src.indexOf('/tasty.js') !== -1) {
			const manual = script.hasAttribute('data-manual') ||
					script.src.indexOf('manual') !== -1,
				url = script.getAttribute('data-url') ||
					script.src.split('tasty.js')[0];
			if (url && !manual) {
				new Tasty(url).connect();
			}
		}
	}
);
